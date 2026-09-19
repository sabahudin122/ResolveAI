import { z } from 'zod';
import { env } from '../../config/env.js';
import type {
  AiProvider,
  TicketAiInput,
  TicketAiResult,
  TicketDraftInput,
  TicketDraftResult,
} from './ai-provider.js';

const openAiResultSchema = z.object({
  summary: z.string(),
  category: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  department: z.string(),
  suggestedResponse: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const openAiDraftSchema = z.object({
  improvedTitle: z.string().min(5).max(160),
  improvedDescription: z.string().min(15).max(5000),
  suggestedCategory: z.string(),
  suggestedPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
  changes: z.array(z.string()).default([]),
  reasoning: z.string(),
});

function resolveCategoryId(input: TicketDraftInput, categoryName: string): string | undefined {
  const category = input.categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase());
  return category?.id;
}

export class OpenAiProvider implements AiProvider {
  async analyzeTicket(input: TicketAiInput): Promise<TicketAiResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You triage internal support tickets. Return only JSON with summary, category, priority, department, suggestedResponse, confidence, and reasoning. Never claim that an action was performed.',
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI response did not include content.');
    }

    const parsed = openAiResultSchema.parse(JSON.parse(content));

    return {
      ...parsed,
      sourceReferences: input.knowledgeMatches.map((match) => ({
        title: match.title,
        locator: `knowledge:${match.id}`,
        excerpt: match.excerpt,
      })),
      mock: false,
      model: env.OPENAI_MODEL,
    };
  }

  async improveTicketDraft(input: TicketDraftInput): Promise<TicketDraftResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You improve employee internal-support ticket drafts. Correct spelling and grammar, make the title specific, make the description professional and clear, preserve the user-reported facts, do not invent actions already taken, and return only JSON with improvedTitle, improvedDescription, suggestedCategory, suggestedPriority, confidence, changes, and reasoning.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              title: input.title,
              description: input.description,
              allowedCategories: input.categories.map((category) => ({
                name: category.name,
                department: category.department,
              })),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI response did not include content.');
    }

    const parsed = openAiDraftSchema.parse(JSON.parse(content));

    return {
      ...parsed,
      suggestedCategoryId: resolveCategoryId(input, parsed.suggestedCategory),
      mock: false,
      model: env.OPENAI_MODEL,
    };
  }
}
