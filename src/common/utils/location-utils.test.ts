import { describe, it, expect } from 'vitest';
import { formatTicketDisplay } from './location-utils.js';
import type { Ticket } from '../types.js';
import type { TicketService } from '../../services/interfaces/TicketService.js';
import { GitHubTicketService } from '../../services/implementations/GitHubTicketService.js';

describe('formatTicketDisplay', () => {
  describe('GitHub Issues', () => {
    const mockGitHubService = {
      getConfig: () => ({ owner: 'test-owner', repo: 'test-repo' })
    } as GitHubTicketService;

    it('should display description + gh command for GitHub issue with description', () => {
      const ticket: Ticket = {
        id: '#123',
        title: 'Test Issue',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: 'user',
        labels: [],
        description: `## Problem
This is a test issue with multiple lines.
It contains markdown formatting.

### Solution
We need to implement the feature.`,
        location: { type: 'github', url: 'https://github.com/test-owner/test-repo/issues/123' }
      };

      const result = formatTicketDisplay(ticket, mockGitHubService);
      
      expect(result).toContain('GitHub Issue #123');
      expect(result).toContain('gh issue view 123');
      expect(result).toContain('## Problem');
      expect(result).toContain('This is a test issue with multiple lines');
      expect(result).toContain('### Solution');
      expect(result).toContain('We need to implement the feature');
      expect(result).toContain('gh issue edit 123');
    });

    it('should display fallback message for GitHub issue without description', () => {
      const ticket: Ticket = {
        id: '#456',
        title: 'Empty Issue',
        status: 'todo',
        priority: 'low',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: '',
        location: { type: 'github', url: 'https://github.com/test-owner/test-repo/issues/456' }
      };

      const result = formatTicketDisplay(ticket, mockGitHubService);
      
      expect(result).toContain('GitHub Issue #456');
      expect(result).toContain('gh issue view 456');
      expect(result).toContain('(No description provided)');
      expect(result).not.toContain('https://github.com');
    });

    it('should handle very long descriptions without truncation', () => {
      const longDescription = 'Very long description.\n'.repeat(50);
      const ticket: Ticket = {
        id: '#789',
        title: 'Long Issue',
        status: 'done',
        priority: 'high',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: longDescription,
        location: { type: 'github', url: 'https://github.com/test-owner/test-repo/issues/789' }
      };

      const result = formatTicketDisplay(ticket, mockGitHubService);
      
      expect(result).toContain('GitHub Issue #789');
      expect(result).toContain(longDescription);
      expect(result.length).toBeGreaterThan(1000); // Should contain full description
    });
  });

  describe('Local tickets', () => {
    const mockLocalService = {
      // Not a GitHubTicketService
    } as TicketService;

    it('should display file path for local ticket with location.path', () => {
      const ticket: Ticket = {
        id: '001',
        title: 'Local Feature',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: 'Local ticket description',
        location: { type: 'local', path: '.tickets/doing/001-custom-path.md' }
      };

      const result = formatTicketDisplay(ticket, mockLocalService);
      
      expect(result).toBe('.tickets/doing/001-custom-path.md');
      expect(result).not.toContain('GitHub');
      expect(result).not.toContain('gh issue');
    });

    it('should generate default path for local ticket without location.path', () => {
      const ticket: Ticket = {
        id: '002',
        title: 'Another Local Feature',
        status: 'todo',
        priority: 'low',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: 'Another local ticket',
        location: undefined
      };

      const result = formatTicketDisplay(ticket, mockLocalService);
      
      expect(result).toBe('.tickets/todo/002-another-local-feature.md');
      expect(result).not.toContain('GitHub');
      expect(result).not.toContain('gh issue');
    });

    it('should handle special characters in title when generating path', () => {
      const ticket: Ticket = {
        id: '003',
        title: 'Fix: API/Auth & Special-Characters!',
        status: 'doing',
        priority: 'high',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: 'Ticket with special chars',
        location: undefined
      };

      const result = formatTicketDisplay(ticket, mockLocalService);
      
      expect(result).toBe('.tickets/doing/003-fix-api-auth-special-characters.md');
      // Title special characters should be removed from slug
      expect(result).not.toContain('&');
      expect(result).not.toContain('!');
      expect(result).not.toContain(':');
    });
  });

  describe('Edge cases', () => {
    const mockGitHubService = {
      getConfig: () => ({ owner: 'test-owner', repo: 'test-repo' })
    } as GitHubTicketService;

    it('should handle GitHub issue ID without # prefix', () => {
      const ticket: Ticket = {
        id: '999',
        title: 'No Prefix',
        status: 'todo',
        priority: 'medium',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: 'Test without # prefix',
        location: { type: 'github', url: 'https://github.com/test-owner/test-repo/issues/999' }
      };

      const result = formatTicketDisplay(ticket, mockGitHubService);
      
      expect(result).toContain('GitHub Issue #999');
      expect(result).toContain('gh issue view 999');
    });

    it('should handle null description', () => {
      const ticket: Ticket = {
        id: '#888',
        title: 'Null Description',
        status: 'todo',
        priority: 'medium',
        created: '2025-01-01',
        updated: '2025-01-01',
        assignee: null,
        labels: [],
        description: null,
        location: { type: 'github', url: 'https://github.com/test-owner/test-repo/issues/888' }
      };

      const result = formatTicketDisplay(ticket, mockGitHubService);
      
      expect(result).toContain('GitHub Issue #888');
      expect(result).toContain('(No description provided)');
    });
  });
});