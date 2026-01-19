/**
 * Hebrew stopwords list for filtering common words from tag extraction.
 * These are common Hebrew words that don't carry significant meaning for tagging.
 */
export const hebrewStopwords = new Set([
  // Prepositions
  'את', 'של', 'על', 'עם', 'אל', 'מן', 'בין', 'לפני', 'אחרי', 'תחת',
  'מתחת', 'מעל', 'ליד', 'אצל', 'בתוך', 'מחוץ', 'דרך', 'בשביל', 'עבור',
  'למען', 'נגד', 'בלי', 'ללא', 'כמו', 'כגון', 'לפי',

  // Pronouns
  'אני', 'אתה', 'את', 'הוא', 'היא', 'אנחנו', 'אתם', 'אתן', 'הם', 'הן',
  'זה', 'זאת', 'זו', 'אלה', 'אלו', 'מי', 'מה', 'איזה', 'איזו', 'אשר',
  'שלי', 'שלך', 'שלו', 'שלה', 'שלנו', 'שלכם', 'שלהם',

  // Conjunctions
  'ו', 'או', 'אם', 'כי', 'אך', 'אולם', 'אבל', 'למרות', 'אף', 'גם',
  'רק', 'בכל', 'שאם', 'כאשר', 'כש', 'לכן', 'משום',

  // Articles and particles
  'ה', 'ב', 'ל', 'מ', 'כ', 'ש',

  // Verbs (common forms)
  'הוא', 'היא', 'היה', 'היתה', 'יהיה', 'תהיה', 'היו', 'יהיו',
  'יש', 'אין', 'היה', 'להיות', 'לעשות', 'עושה', 'עשה', 'עשתה',
  'אומר', 'אמר', 'אמרה', 'לומר', 'להגיד', 'אומרים',
  'רוצה', 'רצה', 'רצתה', 'לרצות', 'רוצים',
  'יודע', 'ידע', 'ידעה', 'לדעת', 'יודעים',
  'צריך', 'צריכה', 'צריכים', 'היה צריך',
  'יכול', 'יכלה', 'יכולים', 'יכולה',

  // Adverbs
  'כן', 'לא', 'מאוד', 'עוד', 'כבר', 'עכשיו', 'היום', 'אתמול', 'מחר',
  'תמיד', 'אף פעם', 'לפעמים', 'הרבה', 'מעט', 'קצת', 'כמעט',
  'ממש', 'באמת', 'בעצם', 'בדיוק', 'פשוט', 'בסך הכל',

  // Question words
  'מה', 'מי', 'איפה', 'מתי', 'למה', 'איך', 'כמה', 'האם',

  // Demonstratives
  'כאן', 'שם', 'פה', 'שמה', 'הנה',

  // Numbers
  'אחד', 'אחת', 'שניים', 'שתיים', 'שלושה', 'שלוש', 'ארבעה', 'ארבע',
  'חמישה', 'חמש', 'שישה', 'שש', 'שבעה', 'שבע', 'שמונה', 'תשע', 'תשעה',
  'עשר', 'עשרה', 'מאה', 'אלף', 'ראשון', 'שני', 'שלישי',

  // Time related
  'שנה', 'שנים', 'חודש', 'חודשים', 'יום', 'ימים', 'שעה', 'שעות',
  'דקה', 'דקות', 'שבוע', 'שבועות',

  // Common words
  'דבר', 'דברים', 'אדם', 'אנשים', 'פעם', 'פעמים', 'צורה', 'מקום',
  'מקומות', 'זמן', 'חלק', 'חלקים', 'עניין', 'עניינים', 'שאלה', 'שאלות',
  'תשובה', 'תשובות', 'בעיה', 'בעיות', 'סיבה', 'סיבות',
  'כלל', 'בכלל', 'לכל', 'כול', 'הכל', 'הכול',

  // Content-specific stopwords (common in video descriptions)
  'התוכן', 'תוכן', 'הצטרפו', 'לעם', 'המדינה', 'מדינה',
  'הערוץ', 'ערוץ', 'הסרטון', 'סרטון', 'הקליפ', 'קליפ',
  'לייק', 'שתפו', 'עקבו', 'הירשמו', 'לינק', 'קישור',
  'פרק', 'הפרק', 'תודה', 'בבקשה', 'נא', 'אנא',
  'כל', 'היכנסו', 'להיכנס', 'הכנסו', 'שורטס',
  'לקישור', 'לנו', 'שלנו', 'אותנו', 'אליכם', 'מכם',
]);

/**
 * Patterns to filter out (noise, special characters, etc.)
 */
export const noisePatterns = [
  /^\*+$/, // Only asterisks
  /^-+$/,  // Only dashes
  /^_+$/,  // Only underscores
  /^\.+$/, // Only dots
  /^\d+$/, // Only numbers
];

/**
 * English stopwords list for filtering common English words
 */
export const englishStopwords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
  'if', 'about', 'after', 'again', 'against', 'any', 'because', 'before',
  'below', 'between', 'during', 'into', 'through', 'under', 'until',
  'while', 'above', 'over', 'out', 'up', 'down', 'off', 'further',
  // Platform-specific
  'shorts', 'video', 'subscribe', 'like', 'share', 'comment', 'channel',
]);

/**
 * Check if a word is a stopword (supports both Hebrew and English)
 */
export function isStopword(word: string): boolean {
  const normalized = word.toLowerCase().trim();
  return hebrewStopwords.has(normalized) || englishStopwords.has(normalized);
}
