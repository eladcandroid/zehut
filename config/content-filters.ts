/**
 * Content Filters Configuration
 *
 * Configuration for filtering YouTube content to ensure relevance
 * to Zehut and Moshe Feiglin topics.
 */

/**
 * Content filters configuration object
 */
export const contentFilters = {
  /**
   * Trusted YouTube channel IDs that bypass all filters
   * Videos from these channels are always accepted
   */
  whitelistedChannels: [
    'UCOZL13F5YxiMtzUTer8zPYA', // YouTube: משה פייגלין - @moshe_feiglin
    'MFeiglin',                  // Facebook: משה פייגלין
    'ZehutParty',                // Facebook: מפלגת זהות
    'moshefeiglin',              // X + Instagram: משה פייגלין
    'zehut.il',                  // Instagram: מפלגת זהות
  ] as string[],

  /**
   * Required keywords for relevance filtering
   * At least one keyword must match in title or description
   * (case-insensitive matching)
   */
  relevanceKeywords: [
    'זהות',
    'פייגלין',
    'משה פייגלין',
    'feiglin',
    'zehut',
    'מפלגת זהות',
    'תנועת זהות',
  ],

  /**
   * Minimum percentage of Hebrew characters required in title
   * Applies to titles longer than 10 characters
   * Value between 0 and 1 (0.2 = 20%)
   */
  minHebrewPercentage: 0.2,
};

/**
 * Content validation result type
 */
export interface ContentValidationResult {
  isRelevant: boolean;
  reason?: string;
}
