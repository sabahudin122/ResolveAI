import { describe, expect, it } from 'vitest';
import { similarityScore, tokenize } from '../src/services/knowledge.service.js';

describe('knowledge keyword retrieval helpers', () => {
  it('tokenizes meaningful words and removes short stop words', () => {
    expect(tokenize('The VPN cannot connect after password change.')).toEqual([
      'vpn',
      'connect',
      'password',
      'change',
    ]);
  });

  it('scores related VPN incidents higher than unrelated facilities issues', () => {
    const query = 'vpn authentication failed after password reset';
    const related = similarityScore(query, 'VPN client authentication cache after password change');
    const unrelated = similarityScore(query, 'office chair request for conference room');

    expect(related).toBeGreaterThan(unrelated);
    expect(related).toBeGreaterThan(0.2);
  });
});
