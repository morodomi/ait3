// Utility functions for common operations
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
}

export class IDUtils {
  /**
   * Format number as zero-padded ticket ID
   */
  static formatTicketId(id: number, length: number = 4): string {
    return id.toString().padStart(length, '0');
  }
}

export class FileUtils {
  /**
   * Generate ticket filename from ID and title
   */
  static generateTicketFilename(id: string, title: string): string {
    const slug = SlugUtils.titleToSlug(title);
    return `${id}-${slug}.md`;
  }
}