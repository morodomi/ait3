/**
 * Utility functions for ticket ID handling
 * Supports both local format (0001) and GitHub format (#1, 1)
 */
export class IDUtils {
  /**
   * Check if a ticket ID is valid
   * Accepts:
   * - Local format: 4-digit numbers (0001, 0042, 1234)
   * - GitHub format: #1-9999 or 1-9999
   */
  static isValidTicketId(id: string): boolean {
    if (!id) return false;
    
    // Local format: exactly 4 digits
    if (/^\d{4}$/.test(id)) {
      return true;
    }
    
    // GitHub format: #1-9999 or 1-9999
    if (/^#?[1-9]\d{0,3}$/.test(id)) {
      return true;
    }
    
    return false;
  }

  /**
   * Normalize ticket ID by removing # prefix for GitHub IDs
   * Local IDs remain unchanged
   */
  static normalizeTicketId(id: string): string {
    return id.replace(/^#/, '');
  }

  /**
   * Detect ID format
   * Returns 'local', 'github', or null
   */
  static getIdFormat(id: string): 'local' | 'github' | null {
    if (!id) return null;
    
    // Local format: exactly 4 digits
    if (/^\d{4}$/.test(id)) {
      return 'local';
    }
    
    // GitHub format: #1-9999 or 1-9999
    if (/^#?[1-9]\d{0,3}$/.test(id)) {
      return 'github';
    }
    
    return null;
  }

  /**
   * Format ticket ID for display
   * Local: 0001
   * GitHub: #1
   */
  static formatTicketId(id: string | number, lengthOrFormat?: number | 'local' | 'github'): string {
    // For backward compatibility with LocalTicketService
    if (typeof lengthOrFormat === 'number') {
      return String(id).padStart(lengthOrFormat, '0');
    }
    
    if (typeof id === 'string') {
      // If already formatted, return as is
      if (lengthOrFormat === 'github' && !id.startsWith('#')) {
        return `#${id}`;
      }
      return id;
    }
    
    // Number to string conversion
    if (lengthOrFormat === 'local' || !lengthOrFormat) {
      return String(id).padStart(4, '0');
    } else {
      return `#${id}`;
    }
  }
}