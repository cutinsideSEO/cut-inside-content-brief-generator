import type { ExtractedTemplate, HeadingNode } from '../types';
import { extractTemplateFromContent, adaptHeadingsToTopic } from './geminiService';
import * as dataforseoService from './dataforseoService';

/**
 * Feature 1: Extract template structure from a URL
 * Fetches the URL content and extracts heading hierarchy using AI
 */
export async function extractTemplateFromUrl(
  url: string,
  apiLogin: string,
  apiPassword: string,
  language: string
): Promise<ExtractedTemplate> {
  // Fetch URL content using existing DataForSEO service
  const onpageData = await dataforseoService.getDetailedOnpageElements(url, apiLogin, apiPassword);

  if (!onpageData.Full_Text || onpageData.Full_Text === "Could not parse the JSON response.") {
    throw new Error("Failed to fetch content from the provided URL.");
  }

  // Extract heading structure using AI
  const headingStructure = await extractTemplateFromContent(onpageData.Full_Text, language);

  return {
    sourceUrl: url,
    headingStructure,
    extractedAt: new Date(),
  };
}

/**
 * Adapt the template headings to a new topic
 */
export async function adaptTemplateToTopic(
  template: ExtractedTemplate,
  newTopic: string,
  language: string
): Promise<HeadingNode[]> {
  return await adaptHeadingsToTopic(
    template.headingStructure,
    template.sourceUrl,
    newTopic,
    language
  );
}

/**
 * Feature 2: Extract heading structure from a brief markdown
 * Parses the Article Structure section to extract headings
 */
export function extractHeadingsFromBrief(briefMarkdown: string): HeadingNode[] {
  const headings: HeadingNode[] = [];

  // Find the Article Structure section
  const structureMatch = briefMarkdown.match(/## Article Structure[\s\S]*?(?=##\s|$)/i);
  if (!structureMatch) {
    throw new Error("Could not find Article Structure section in the brief.");
  }

  const structureSection = structureMatch[0];

  // Parse heading lines - looking for patterns like "### H2: Heading Text" or "#### H3: Heading Text"
  const headingRegex = /^(#{2,5})\s+(?:\*\*)?\s*(H\d+|Hero|Conclusion):\s*(.*?)\s*(?:\*\*)?(?:\s*\{#.*?\})?$/gm;
  const stack: { level: number; node: HeadingNode }[] = [];

  let match;
  while ((match = headingRegex.exec(structureSection)) !== null) {
    const mdLevel = match[1].length; // Number of # characters
    const hType = match[2]; // H2, H3, Hero, Conclusion
    const text = match[3].trim();

    // Convert H type to numeric level
    let numericLevel: 1 | 2 | 3 | 4;
    if (hType === 'Hero') {
      numericLevel = 1;
    } else if (hType === 'Conclusion') {
      numericLevel = 2;
    } else {
      numericLevel = parseInt(hType.substring(1), 10) as 1 | 2 | 3 | 4;
    }

    const node: HeadingNode = {
      level: numericLevel,
      text,
      children: [],
    };

    // Pop stack until we find a parent with lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= mdLevel) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      headings.push(node);
    }

    stack.push({ level: mdLevel, node });
  }

  if (headings.length === 0) {
    throw new Error("No valid headings found in the Article Structure section.");
  }

  return headings;
}

/**
 * Convert HeadingNode structure to OutlineItem structure for Step 5
 * This adapts the template format to the brief generation format
 */
export function headingNodesToOutlineItems(headings: HeadingNode[]): any[] {
  return headings.map(heading => ({
    level: `H${heading.level}`,
    heading: heading.adaptedText || heading.text,
    guidelines: heading.guidelines ? [heading.guidelines] : [],
    reasoning: 'Pre-populated from template structure',
    children: heading.children.length > 0 ? headingNodesToOutlineItems(heading.children) : [],
    targeted_keywords: [],
    competitor_coverage: [],
    additional_resources: [],
  }));
}
