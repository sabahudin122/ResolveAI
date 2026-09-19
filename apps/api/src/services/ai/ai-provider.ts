import type { Priority } from '@opspilot/shared';
import type { KnowledgeMatch } from '../knowledge.service.js';

export type TicketAiInput = {
  title: string;
  description: string;
  knowledgeMatches: KnowledgeMatch[];
  similarTickets: Array<{
    number: string;
    title: string;
    score: number;
  }>;
};

export type TicketAiResult = {
  summary: string;
  category: string;
  priority: Priority;
  department: string;
  suggestedResponse: string;
  confidence: number;
  reasoning: string;
  sourceReferences: Array<{
    title: string;
    locator: string;
    excerpt: string;
  }>;
  mock: boolean;
  model: string;
};

export type TicketDraftInput = {
  title: string;
  description: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    department?: string | null;
  }>;
};

export type TicketDraftResult = {
  improvedTitle: string;
  improvedDescription: string;
  suggestedCategory: string;
  suggestedCategoryId?: string;
  suggestedPriority: Priority;
  confidence: number;
  changes: string[];
  reasoning: string;
  mock: boolean;
  model: string;
};

export interface AiProvider {
  analyzeTicket(input: TicketAiInput): Promise<TicketAiResult>;
  improveTicketDraft(input: TicketDraftInput): Promise<TicketDraftResult>;
}
