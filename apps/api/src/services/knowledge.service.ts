import { prisma } from '../lib/prisma.js';

export type KnowledgeMatch = {
  id: string;
  title: string;
  excerpt: string;
  score: number;
};

const stopWords = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'after',
  'before',
  'have',
  'cannot',
  'cant',
  'into',
  'when',
  'your',
  'you',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

export function similarityScore(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / new Set([...leftTokens, ...rightTokens]).size;
}

export async function searchKnowledge(
  organizationId: string,
  query: string,
  limit = 5,
): Promise<KnowledgeMatch[]> {
  const docs = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId,
      isPublished: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return docs
    .map((doc) => {
      const score = similarityScore(query, `${doc.title} ${doc.body}`);
      const firstHit = doc.body.slice(0, 260);
      return {
        id: doc.id,
        title: doc.title,
        excerpt: firstHit,
        score,
      };
    })
    .filter((doc) => doc.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
