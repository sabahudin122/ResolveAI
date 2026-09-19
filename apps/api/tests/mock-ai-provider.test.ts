import { describe, expect, it } from 'vitest';
import { MockAiProvider } from '../src/services/ai/mock-ai-provider.js';

describe('mock AI provider', () => {
  it('triages VPN password problems to IT support without needing an API key', async () => {
    const provider = new MockAiProvider();
    const result = await provider.analyzeTicket({
      title: 'Cannot connect to VPN after password change',
      description: 'The VPN says authentication failed after I changed my password.',
      knowledgeMatches: [
        {
          id: 'doc-1',
          title: 'Reset company VPN after password change',
          excerpt: 'Forget saved credentials and sign in again.',
          score: 0.9,
        },
      ],
      similarTickets: [],
    });

    expect(result.mock).toBe(true);
    expect(result.department).toBe('IT Support');
    expect(result.category).toBe('Network access');
    expect(result.priority).toBe('HIGH');
    expect(result.sourceReferences).toHaveLength(1);
  });
});
