import { isStopword, noisePatterns } from './hebrew-stopwords';

/**
 * Category patterns for automatic categorization
 * Each category has Hebrew keywords that indicate the category
 */
const categoryPatterns: Record<string, string[]> = {
  'פוליטיקה': [
    'ממשלה', 'כנסת', 'בחירות', 'ראש הממשלה', 'שר', 'חוק', 'מפלגה',
    'קואליציה', 'אופוזיציה', 'הצבעה', 'חקיקה', 'דמוקרטיה', 'שלטון',
    'פוליטי', 'נתניהו', 'ביבי', 'לפיד', 'גנץ', 'ליברמן', 'בן גביר',
    'סמוטריץ', 'שקד', 'בנט', 'מרב מיכאלי',
  ],
  'כלכלה': [
    'כלכלה', 'כסף', 'תקציב', 'מס', 'מיסים', 'בנק', 'שוק', 'מניות',
    'ריבית', 'אינפלציה', 'יוקר', 'מחירים', 'שכר', 'משכורת', 'עסק',
    'השקעה', 'נדלן', 'דירות', 'משכנתא', 'דולר', 'שקל', 'חוב',
    'צמיחה', 'מיתון', 'אבטלה', 'תעסוקה',
  ],
  'ביטחון': [
    'צבא', 'צהל', 'חייל', 'חיילים', 'מלחמה', 'טרור', 'פיגוע',
    'רקטה', 'רקטות', 'חמאס', 'חיזבאללה', 'איראן', 'גבול', 'עזה',
    'לבנון', 'סוריה', 'יהודה ושומרון', 'התנחלות', 'פלסטינים',
    'כיפת ברזל', 'חיל אוויר', 'מודיעין', 'שבכ', 'מוסד',
    'אנטישמיות', 'שואה', 'ניצולי שואה',
  ],
  'חברה': [
    'חינוך', 'בריאות', 'בית חולים', 'רופא', 'מחאה', 'הפגנה',
    'זכויות', 'שוויון', 'מגזר', 'חרדים', 'דתיים', 'חילונים',
    'ערבים', 'דרוזים', 'עדות', 'קהילה', 'רווחה', 'עוני', 'פער',
    'משפחה', 'נישואין', 'גירושין', 'ילדים', 'קשישים', 'נכים',
  ],
  'משפט': [
    'משפט', 'בית משפט', 'שופט', 'עליון', 'בגץ', 'פרקליטות',
    'משטרה', 'חקירה', 'כתב אישום', 'עורך דין', 'עבריין', 'פשע',
    'מעצר', 'כלא', 'רצח', 'גניבה', 'הונאה', 'שחיתות',
  ],
  'טכנולוגיה': [
    'טכנולוגיה', 'הייטק', 'סטארטאפ', 'אפליקציה', 'אינטרנט',
    'בינה מלאכותית', 'רובוט', 'סייבר', 'מחשב', 'תוכנה', 'נתונים',
    'דיגיטלי', 'חדשנות', 'פיתוח',
  ],
  'תרבות': [
    'תרבות', 'אמנות', 'מוזיקה', 'סרט', 'קולנוע', 'תיאטרון',
    'ספר', 'סופר', 'שיר', 'זמר', 'הופעה', 'פסטיבל', 'מוזיאון',
    'ציור', 'פיסול', 'ריקוד',
  ],
  'ספורט': [
    'ספורט', 'כדורגל', 'כדורסל', 'טניס', 'שחייה', 'אולימפיאדה',
    'אליפות', 'קבוצה', 'שער', 'ניצחון', 'הפסד', 'משחק', 'ליגה',
    'מכבי', 'הפועל', 'בית"ר',
  ],
  'דת': [
    'דת', 'יהדות', 'תורה', 'רב', 'רבנות', 'כשרות', 'שבת', 'חג',
    'תפילה', 'בית כנסת', 'ישיבה', 'הלכה', 'מצווה', 'קודש',
    'משיח', 'גאולה', 'אמונה',
  ],
  'סביבה': [
    'סביבה', 'אקלים', 'זיהום', 'מיחזור', 'אנרגיה', 'ירוק', 'טבע',
    'חיות', 'צמחים', 'ים', 'נהר', 'יער', 'מדבר', 'שמורה',
  ],
  'בריאות': [
    'בריאות', 'מחלה', 'תרופה', 'חיסון', 'קורונה', 'וירוס',
    'אשפוז', 'ניתוח', 'טיפול', 'רפואה', 'קופת חולים',
  ],
};

/**
 * Maximum number of tags to generate per content item
 */
const MAX_TAGS = 10;

/**
 * Minimum word length to consider for keyword extraction
 */
const MIN_WORD_LENGTH = 2;

/**
 * Check if a string matches any noise pattern
 */
function isNoise(text: string): boolean {
  return noisePatterns.some((pattern) => pattern.test(text));
}

/**
 * Check if a tag is invalid (broken fragment, contains quotes, etc.)
 */
function isInvalidTag(tag: string): boolean {
  // Contains any quotation marks or special punctuation
  if (/["״׳''""«»„"‟‹›「」『』【】〈〉《》]/.test(tag)) return true;

  // Pure Hebrew text that's too short (1-3 chars) - likely abbreviation fragment
  if (/^[\u0590-\u05FF]{1,3}$/.test(tag)) return true;

  // Single English word that's too short
  if (/^[a-zA-Z]{1,2}$/.test(tag)) return true;

  // Tag with spaces that's too long (sentence fragment)
  if (tag.includes(' ') && tag.length > 25) return true;

  // Starts with a short Hebrew word followed by long text (fragment pattern)
  if (/^[\u0590-\u05FF]{2,3}\s+[\u0590-\u05FF\s]{10,}$/.test(tag)) return true;

  // Contains only numbers or is mostly numbers
  if (/^\d+$/.test(tag) || /^\d[\d\s,.]*$/.test(tag)) return true;

  // URL-like patterns
  if (/^(https?|www\.|\.com|\.co\.il)/i.test(tag)) return true;

  return false;
}

/**
 * Extract hashtags from text
 */
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\u0590-\u05FFa-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
}

/**
 * Extract significant keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove URLs
  const withoutUrls = text.replace(/https?:\/\/[^\s]+/g, '');

  // Remove hashtags (they're handled separately)
  const withoutHashtags = withoutUrls.replace(/#[\u0590-\u05FFa-zA-Z0-9_]+/g, '');

  // Split into words
  const words = withoutHashtags
    .split(/[\s,.:;!?()\[\]{}""''״׳\-–—]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= MIN_WORD_LENGTH);

  // Filter stopwords and count occurrences
  const wordCounts = new Map<string, number>();

  for (const word of words) {
    if (!isStopword(word)) {
      const normalized = word.toLowerCase();
      wordCounts.set(normalized, (wordCounts.get(normalized) || 0) + 1);
    }
  }

  // Sort by frequency and return top keywords
  return Array.from(wordCounts.entries())
    .filter(([, count]) => count >= 2) // Only words that appear at least twice
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Detect categories based on keyword patterns
 */
function detectCategories(text: string): string[] {
  const categories: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryPatterns)) {
    const matchCount = keywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    ).length;

    // Require at least 2 keyword matches for a category
    if (matchCount >= 2) {
      categories.push(category);
    }
  }

  return categories;
}

/**
 * Extract named entities (proper nouns, organizations, etc.)
 * Simple heuristic: words that start with capital letters in English
 * or appear in quotes in Hebrew
 */
function extractNamedEntities(text: string): string[] {
  const entities: string[] = [];

  // English proper nouns (capitalized words not at sentence start)
  const englishMatches = text.match(/(?<=[a-z]\s)[A-Z][a-z]+/g);
  if (englishMatches) {
    entities.push(...englishMatches.filter((e) => !isStopword(e)));
  }

  // Quoted text (potential names/titles in Hebrew)
  const quotedMatches = text.match(/["״]([^"״]+)["״]/g);
  if (quotedMatches) {
    for (const match of quotedMatches) {
      const cleaned = match.replace(/["״]/g, '').trim();
      if (cleaned.length > 2 && cleaned.length < 30) {
        entities.push(cleaned);
      }
    }
  }

  return entities.slice(0, 3);
}

export interface AutoTagResult {
  tags: string[];
  hashtags: string[];
  categories: string[];
  keywords: string[];
}

/**
 * Generate tags automatically from text content
 * Combines hashtags, categories, and keywords
 */
export function generateTags(
  title: string,
  description: string
): string[] {
  const fullText = `${title} ${description}`;

  // Extract hashtags only from title — descriptions often contain
  // boilerplate/channel-wide hashtags unrelated to the specific content
  const hashtags = extractHashtags(title);
  const categories = detectCategories(fullText);
  const keywords = extractKeywords(fullText);
  const namedEntities = extractNamedEntities(fullText);

  // Combine all tags, prioritizing:
  // 1. Hashtags (user-provided, most relevant)
  // 2. Categories (detected topics)
  // 3. Named entities (people, places, organizations)
  // 4. Keywords (frequent significant words)
  const allTags = [
    ...hashtags,
    ...categories,
    ...namedEntities,
    ...keywords,
  ];

  // Deduplicate (case-insensitive), filter noise/broken tags, and limit
  const seen = new Set<string>();
  const uniqueTags: string[] = [];

  for (const tag of allTags) {
    const normalized = tag.toLowerCase();
    if (
      !seen.has(normalized) &&
      tag.length >= MIN_WORD_LENGTH &&
      !isNoise(tag) &&
      !isStopword(tag) &&
      !isInvalidTag(tag)
    ) {
      seen.add(normalized);
      uniqueTags.push(tag);
      if (uniqueTags.length >= MAX_TAGS) break;
    }
  }

  return uniqueTags;
}

/**
 * Get detailed tag analysis (useful for debugging/admin)
 */
export function analyzeContent(
  title: string,
  description: string
): AutoTagResult {
  const fullText = `${title} ${description}`;

  return {
    tags: generateTags(title, description),
    hashtags: extractHashtags(title),
    categories: detectCategories(fullText),
    keywords: extractKeywords(fullText),
  };
}
