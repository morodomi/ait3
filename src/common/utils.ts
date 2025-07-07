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

export class IDUtils {
  /**
   * Format number as zero-padded ticket ID
   */
  static formatTicketId(id: number, length: number = 4): string {
    return id.toString().padStart(length, '0');
  }

  /**
   * Validate ticket ID format (4-digit number)
   */
  static isValidTicketId(id: string): boolean {
    return /^\d{4}$/.test(id);
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