import { env } from '../../config/env.js';
import type { AiProvider } from './ai-provider.js';
import { MockAiProvider } from './mock-ai-provider.js';
import { OpenAiProvider } from './openai-provider.js';

export function createAiProvider(): AiProvider {
  if (env.OPENAI_API_KEY) {
    return new OpenAiProvider();
  }

  return new MockAiProvider();
}
