import type { ContentBrief, OutlineItem, HeadingNode } from '../types';

// Helper to sanitize table headers into valid, predictable object keys
const sanitizeHeader = (header: string): string => {
    return header
        .trim()
        .toLowerCase()
        .replace(/\(.*\)/g, '') // Remove content in parentheses
        .replace(/[^a-z0-9\s_]+/g, '') // Remove special characters except underscore and space
        .trim()
        .replace(/\s+/g, '_'); // Replace spaces with underscores
};


// Helper to parse a markdown table into an array of objects
const parseTable = (tableMarkdown: string): { [key: string]: string }[] => {
    const lines = tableMarkdown.trim().split('\n');
    if (lines.length < 2) {
        return [];
    }

    const headerLine = lines[0].trim();
    const cleanHeaderLine = headerLine.startsWith('|') && headerLine.endsWith('|')
        ? headerLine.substring(1, headerLine.length - 1)
        : headerLine;
        
    const headers = cleanHeaderLine.split('|').map(sanitizeHeader);

    if (!lines[1] || !lines[1].includes('---')) {
        return [];
    }
    
    const dataRows = lines.slice(2);
    const result: { [key: string]: string }[] = [];

    dataRows.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const cleanDataLine = trimmedLine.startsWith('|') && trimmedLine.endsWith('|')
            ? trimmedLine.substring(1, trimmedLine.length - 1)
            : trimmedLine;

        const values = cleanDataLine.split('|').map(v => v.trim());
        
        const rowObject: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            rowObject[header] = values[index] || '';
        });
        result.push(rowObject);
    });

    return result;
};


const parseOutline = (outlineMarkdown: string): OutlineItem[] => {
    const lines = outlineMarkdown.trim().split('\n');
    const outline: OutlineItem[] = [];
    const stack: { level: number; item: OutlineItem }[] = [];
    let currentMode: 'guidelines' | null = null;

    // Regex to capture: level (###), optional bolding, type (H2, Hero), heading text, and optional anchor
    const levelRegex = /^(#+)\s+(?:\*\*)?\s*(H\d+|Hero|Conclusion):\s*(.*?)\s*(?:\*\*)?(?:\s*\{#.*?\})?$/;

    lines.forEach(line => {
        const headingMatch = line.match(levelRegex);
        if (headingMatch) {
            currentMode = null; // Reset mode on new heading
            const level = headingMatch[1].length;
            const item: OutlineItem = {
                level: headingMatch[2],
                heading: headingMatch[3].trim(),
                guidelines: [],
                reasoning: '', // Reasoning isn't in this part of the MD
                children: [],
                targeted_keywords: [],
                competitor_coverage: [],
                additional_resources: []
            };

            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            if (stack.length > 0) {
                stack[stack.length - 1].item.children.push(item);
            } else {
                outline.push(item);
            }
            stack.push({ level, item });
        } else if (stack.length > 0) {
            const currentItem = stack[stack.length - 1].item;
            const lineTrimmed = line.trim();

            if (lineTrimmed.startsWith('* **Targets:**')) {
                currentMode = null;
                currentItem.targeted_keywords = line.match(/`([^`]+)`/g)?.map(s => s.replace(/`/g, '')) || [];
            } else if (lineTrimmed.startsWith('* **Covered By:**')) {
                currentMode = null;
                const links = Array.from(line.matchAll(/\[.*?\]\((.*?)\)/g)).map(match => match[1]);
                currentItem.competitor_coverage = links;
            } else if (lineTrimmed.startsWith('* **Guidelines:**')) {
                currentMode = 'guidelines';
            } else if (currentMode === 'guidelines' && /^\s*(\*|-)\s+/.test(lineTrimmed)) {
                currentItem.guidelines.push(lineTrimmed.replace(/^\s*(\*|-)\s+/, '').trim());
            }
        }
    });

    return outline;
};

// Extracts content between a start marker (RegExp) and an end marker (RegExp), or to the end of the string.
const extractSection = (startMarker: RegExp, endMarker: RegExp | null, content: string): string => {
    const startMatch = content.match(startMarker);
    if (!startMatch || typeof startMatch.index === 'undefined') {
        return '';
    }
    
    const startIndex = startMatch.index + startMatch[0].length;
    let endIndex = content.length;
    
    if (endMarker) {
        const remainingContent = content.substring(startIndex);
        const endMatch = remainingContent.match(endMarker);
        if (endMatch && typeof endMatch.index !== 'undefined') {
            endIndex = startIndex + endMatch.index;
        }
    }
    
    return content.substring(startIndex, endIndex).trim();
};


export const parseMarkdownBrief = (markdown: string): Partial<ContentBrief> => {
    const brief: Partial<ContentBrief> = {};
    
    const headerContent = extractSection(/^/, /^## /m, markdown);

    const goalMatch = headerContent.match(/### Page Goal[\s\S]*?\*\*Goal:\*\*\s(.*?)\n/);
    if (goalMatch) {
        brief.page_goal = { value: goalMatch[1].trim(), reasoning: '' };
    }
    const audienceMatch = headerContent.match(/### Target Audience[\s\S]*?\*\*Audience:\*\*\s(.*?)\n/);
    if (audienceMatch) {
        brief.target_audience = { value: audienceMatch[1].trim(), reasoning: '' };
    }

    const keywordSection = extractSection(/^## Keyword Strategy.*$/m, /^## /m, markdown);
    if (keywordSection) {
        const table = parseTable(keywordSection);
        brief.keyword_strategy = {
            primary_keywords: table
                .filter(r => r.type?.toLowerCase().includes('primary'))
                .map(r => ({ keyword: r.keyword, notes: r.intent_notes || '' })),
            secondary_keywords: table
                .filter(r => r.type?.toLowerCase().includes('secondary'))
                .map(r => ({ keyword: r.keyword, notes: r.intent_notes || '' })),
            reasoning: '',
        };
    }

    const seoSection = extractSection(/^## On Page SEO.*$/m, /^## /m, markdown);
    if (seoSection) {
        const table = parseTable(seoSection);
        const seoData: any = {
            title_tag: { value: '', reasoning: '' },
            meta_description: { value: '', reasoning: '' },
            h1: { value: '', reasoning: '' },
            url_slug: { value: '', reasoning: '' },
            og_title: { value: '', reasoning: '' },
            og_description: { value: '', reasoning: '' }
        };

        table.forEach(row => {
            if (row.element) {
                const key = sanitizeHeader(row.element.replace(/\*\*/g, ''));
                const mappedKey = {
                    'meta_title': 'title_tag', 'title_tag': 'title_tag',
                    'meta_description': 'meta_description',
                    'url_slug': 'url_slug',
                    'h1': 'h1',
                    'og_title': 'og_title',
                    'og_description': 'og_description'
                }[key];

                if (mappedKey) {
                    seoData[mappedKey] = { value: row.recommendation, reasoning: row.reasoning || '' };
                }
            }
        });
        brief.on_page_seo = seoData;
    }
    
    // Use a more robust extraction for Article Structure, which can contain its own H2s.
    // It starts at "Article Structure" and ends right before "Frequently Asked Questions".
    const structureSection = extractSection(
        /^## Article Structure.*$/m, 
        /^##.*? Frequently Asked Questions.*$/m, 
        markdown
    );
    if(structureSection) {
        const wordCountMatch = structureSection.match(/\*\*Recommended Word Count:\*\*\s([\d,]+)/);
        const wordCount = wordCountMatch ? parseInt(wordCountMatch[1].replace(/,/g, ''), 10) : 0;
        
        brief.article_structure = {
            word_count_target: wordCount,
            reasoning: '',
            outline: parseOutline(structureSection),
        };
    }

    const faqSection = extractSection(/^##.*? Frequently Asked Questions.*$/m, null, markdown);
    if (faqSection) {
        const questions: { question: string; guidelines: string[] }[] = [];
        // Updated regex to handle both "Q: " and "**H3: " formats for better compatibility
        const questionBlocks = faqSection.split(/\n### (?:Q:|\*\*H3:)\s/g).slice(1);
        questionBlocks.forEach(block => {
            const lines = block.split('\n');
            const question = lines[0].replace(/\*\*$/, '').trim(); // Remove trailing asterisks from bolding
            const guidelines = lines.slice(1)
                .map(l => l.trim())
                .filter(l => l.startsWith('*') || l.startsWith('-'))
                .map(l => l.replace(/^\s*(\*|-)\s*/, '').trim())
                .filter(Boolean);
            questions.push({ question, guidelines });
        });
        brief.faqs = { questions, reasoning: '' };
    }
    
    if (!brief.on_page_seo || !brief.article_structure || brief.article_structure.outline.length === 0) {
        throw new Error("Markdown parsing failed. Critical sections like 'On Page SEO' or a valid 'Article Structure' with headings could not be found. Please ensure the uploaded file is a complete brief with a standard format.");
    }

    return brief;
};

/**
 * Feature 2: Extract heading structure from a brief markdown for use as a template
 * This extracts just the heading hierarchy, stripping out content-specific details
 */
export const extractTemplateFromBrief = (markdown: string): HeadingNode[] => {
    const brief = parseMarkdownBrief(markdown);

    if (!brief.article_structure || !brief.article_structure.outline) {
        throw new Error("No article structure found in the brief.");
    }

    // Convert OutlineItem[] to HeadingNode[]
    const convertOutlineToHeadings = (items: OutlineItem[]): HeadingNode[] => {
        return items.map(item => {
            // Parse level from string like "H2", "H3", "Hero", "Conclusion"
            let numericLevel: 1 | 2 | 3 | 4 = 2;
            if (item.level === 'Hero') {
                numericLevel = 1;
            } else if (item.level === 'Conclusion') {
                numericLevel = 2;
            } else if (item.level.startsWith('H')) {
                const parsed = parseInt(item.level.substring(1), 10);
                numericLevel = (parsed >= 1 && parsed <= 4 ? parsed : 2) as 1 | 2 | 3 | 4;
            }

            const headingNode: HeadingNode = {
                level: numericLevel,
                text: item.heading,
                children: item.children && item.children.length > 0
                    ? convertOutlineToHeadings(item.children)
                    : [],
            };

            // Optionally include guidelines as a hint
            if (item.guidelines && item.guidelines.length > 0) {
                headingNode.guidelines = item.guidelines[0];
            }

            return headingNode;
        });
    };

    return convertOutlineToHeadings(brief.article_structure.outline);
};

/**
 * Check if a markdown file is a valid brief that can be used as a template
 */
export const isValidBriefTemplate = (markdown: string): boolean => {
    try {
        const headings = extractTemplateFromBrief(markdown);
        return headings.length > 0;
    } catch {
        return false;
    }
};