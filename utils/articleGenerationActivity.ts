import type { GeneratingBrief } from '../types/generationActivity';

export interface ArticleGenerationActivityItem {
  briefId: string;
  generation: GeneratingBrief;
}

export function getActiveArticleGenerationItems(
  generatingBriefs: Record<string, GeneratingBrief>
): ArticleGenerationActivityItem[] {
  return Object.entries(generatingBriefs)
    .filter(([, generation]) => generation.status === 'generating_content')
    .sort(([, a], [, b]) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .map(([briefId, generation]) => ({ briefId, generation }));
}
