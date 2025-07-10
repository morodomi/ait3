// Utility functions for common operations
export { IDUtils } from './utils/id-utils.js';
export { FileUtils } from './utils/file-utils.js';

export class SlugUtils {
  /**
   * Convert title to filename-safe slug
   */
  static titleToSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
  }
}

export class TimeUtils {
  /**
   * Get current ISO timestamp
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * Format ISO date string to human-readable format (YYYY-MM-DD HH:MM)
   */
  static formatDate(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

// IDUtils is now in ./utils/id-utils.ts
// FileUtils is now in ./utils/file-utils.ts