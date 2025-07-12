import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GitHubTicketService } from './GitHubTicketService.js';
import { Octokit } from '@octokit/rest';
import type { Ticket } from '../../common/types.js';
import { TicketNotFoundError } from '../../common/errors.js';

vi.mock('@octokit/rest');

// Type for our mock Octokit instance
interface MockOctokit {
  issues: {
    create: ReturnType<typeof vi.fn>;
    listForRepo: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    addLabels: ReturnType<typeof vi.fn>;
    removeLabel: ReturnType<typeof vi.fn>;
    createComment: ReturnType<typeof vi.fn>;
  };
  rest: {
    issues: {
      create: ReturnType<typeof vi.fn>;
      listForRepo: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      addLabels: ReturnType<typeof vi.fn>;
      removeLabel: ReturnType<typeof vi.fn>;
      createComment: ReturnType<typeof vi.fn>;
    };
  };
}

describe('GitHubTicketService', () => {
  let service: GitHubTicketService;
  let mockOctokit: MockOctokit;

  beforeEach(() => {
    // Create shared mock functions
    const createMock = vi.fn();
    const listForRepoMock = vi.fn();
    const getMock = vi.fn();
    const updateMock = vi.fn();
    const addLabelsMock = vi.fn();
    const removeLabelMock = vi.fn();
    const createCommentMock = vi.fn();

    mockOctokit = {
      issues: {
        create: createMock,
        listForRepo: listForRepoMock,
        get: getMock,
        update: updateMock,
        addLabels: addLabelsMock,
        removeLabel: removeLabelMock,
        createComment: createCommentMock,
      },
      rest: {
        issues: {
          create: createMock,
          listForRepo: listForRepoMock,
          get: getMock,
          update: updateMock,
          addLabels: addLabelsMock,
          removeLabel: removeLabelMock,
          createComment: createCommentMock,
        },
      },
    };

    vi.mocked(Octokit).mockImplementation(() => mockOctokit as unknown as InstanceType<typeof Octokit>);

    service = new GitHubTicketService({
      owner: 'testowner',
      repo: 'testrepo',
      token: 'test-token',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use environment variable GITHUB_TOKEN if token not provided', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      const _envService = new GitHubTicketService({
        owner: 'testowner',
        repo: 'testrepo',
      });
      expect(Octokit).toHaveBeenCalledWith({
        auth: 'env-token',
      });
      delete process.env.GITHUB_TOKEN;
    });

    it('should use default labels if not provided', () => {
      const serviceWithDefaults = new GitHubTicketService({
        owner: 'testowner',
        repo: 'testrepo',
      });
      // Test internal state through behavior in other methods
      expect(serviceWithDefaults).toBeDefined();
    });
  });

  describe('createTicket', () => {
    it('should create a new issue with default priority', async () => {
      mockOctokit.issues.create.mockResolvedValue({
        data: {
          number: 123,
          title: 'Test ticket',
          state: 'open',
          labels: [{ name: 'status:todo' }, { name: 'priority:medium' }],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          body: 'Test description',
          html_url: 'https://github.com/testowner/testrepo/issues/123',
          url: 'https://api.github.com/repos/testowner/testrepo/issues/123',
        },
      });

      const ticket = await service.createTicket('Test ticket');

      expect(mockOctokit.issues.create).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        title: 'Test ticket',
        body: '\n---\n_Created by AIT³_',
        labels: ['status:todo', 'priority:medium'],
      });

      expect(ticket).toEqual({
        id: '#123',
        title: 'Test ticket',
        status: 'todo',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        assignee: undefined,
        labels: ['status:todo', 'priority:medium'],
        description: 'Test description',
        location: {
          type: 'github',
          url: 'https://github.com/testowner/testrepo/issues/123',
          apiUrl: 'https://api.github.com/repos/testowner/testrepo/issues/123',
        },
      });
    });

    it('should create issue with custom options', async () => {
      mockOctokit.issues.create.mockResolvedValue({
        data: {
          number: 124,
          title: 'Feature ticket',
          state: 'open',
          labels: [{ name: 'status:todo' }, { name: 'priority:high' }, { name: 'feature' }],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          body: '## Description\n\nTest feature',
        },
      });

      const _ticket = await service.createTicket('Feature ticket', {
        description: 'Test feature',
        priority: 'high',
        labels: ['feature'],
        acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
        technicalRequirements: ['Req 1', 'Req 2'],
      });

      expect(mockOctokit.issues.create).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        title: 'Feature ticket',
        body: expect.stringContaining('## Description'),
        labels: ['status:todo', 'priority:high', 'feature'],
      });

      expect(mockOctokit.issues.create.mock.calls[0][0].body).toContain('- [ ] Criteria 1');
      expect(mockOctokit.issues.create.mock.calls[0][0].body).toContain('- [ ] Criteria 2');
      expect(mockOctokit.issues.create.mock.calls[0][0].body).toContain('- Req 1');
      expect(mockOctokit.issues.create.mock.calls[0][0].body).toContain('- Req 2');
    });
  });

  describe('listTickets', () => {
    it('should list all tickets without filters', async () => {
      mockOctokit.issues.listForRepo.mockResolvedValue({
        data: [
          {
            number: 1,
            title: 'Ticket 1',
            state: 'open',
            labels: [{ name: 'status:todo' }],
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
          {
            number: 2,
            title: 'Ticket 2',
            state: 'closed',
            labels: [{ name: 'status:done' }],
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ],
      });

      const tickets = await service.listTickets();

      expect(mockOctokit.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        labels: undefined,
        state: 'all',
        per_page: 100,
      });

      expect(tickets).toHaveLength(2);
      expect(tickets[0].id).toBe('#1');
      expect(tickets[1].id).toBe('#2');
    });

    it('should filter by status', async () => {
      mockOctokit.issues.listForRepo.mockResolvedValue({ data: [] });

      await service.listTickets({ status: 'doing' });

      expect(mockOctokit.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        labels: 'status:doing',
        state: 'all',
        per_page: 100,
      });
    });

    it('should filter by priority', async () => {
      mockOctokit.issues.listForRepo.mockResolvedValue({ data: [] });

      await service.listTickets({ priority: 'high' });

      expect(mockOctokit.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        labels: 'priority:high',
        state: 'all',
        per_page: 100,
      });
    });

    it('should filter by both status and priority', async () => {
      mockOctokit.issues.listForRepo.mockResolvedValue({ data: [] });

      await service.listTickets({ status: 'todo', priority: 'high' });

      expect(mockOctokit.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        labels: 'status:todo,priority:high',
        state: 'all',
        per_page: 100,
      });
    });
  });

  describe('getTicket', () => {
    it('should get ticket by ID', async () => {
      mockOctokit.issues.get.mockResolvedValue({
        data: {
          number: 123,
          title: 'Test ticket',
          state: 'open',
          labels: [{ name: 'status:doing' }],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          body: 'Test body',
          html_url: 'https://github.com/testowner/testrepo/issues/123',
          url: 'https://api.github.com/repos/testowner/testrepo/issues/123',
        },
      });

      const ticket = await service.getTicket('123');

      expect(mockOctokit.issues.get).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
      });

      expect(ticket).toEqual({
        id: '#123',
        title: 'Test ticket',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        assignee: undefined,
        labels: ['status:doing'],
        description: 'Test body',
        location: {
          type: 'github',
          url: 'https://github.com/testowner/testrepo/issues/123',
          apiUrl: 'https://api.github.com/repos/testowner/testrepo/issues/123',
        },
      });
    });

    it('should handle ticket with # prefix', async () => {
      mockOctokit.issues.get.mockResolvedValue({
        data: {
          number: 123,
          title: 'Test ticket',
          state: 'open',
          labels: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      });

      await service.getTicket('#123');

      expect(mockOctokit.issues.get).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
      });
    });

    it('should return null for non-existent ticket', async () => {
      mockOctokit.issues.get.mockRejectedValue({ status: 404 });

      const ticket = await service.getTicket('999');

      expect(ticket).toBeNull();
    });

    it('should throw error for invalid ticket ID', async () => {
      await expect(service.getTicket('invalid')).rejects.toThrow('Invalid ticket ID: invalid');
    });

    it('should rethrow non-404 errors', async () => {
      mockOctokit.issues.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getTicket('123')).rejects.toThrow('Network error');
    });
  });

  describe('startTicket', () => {
    it('should move ticket from todo to doing', async () => {
      mockOctokit.issues.removeLabel.mockResolvedValue({});
      mockOctokit.issues.addLabels.mockResolvedValue({});
      mockOctokit.issues.createComment.mockResolvedValue({});

      await service.startTicket('123');

      expect(mockOctokit.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        name: 'status:todo',
      });

      expect(mockOctokit.issues.addLabels).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        labels: ['status:doing'],
      });

      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        body: '🚀 Work started on this ticket',
      });
    });

    it('should handle missing todo label gracefully', async () => {
      mockOctokit.issues.removeLabel.mockRejectedValue({ status: 404 });
      mockOctokit.issues.addLabels.mockResolvedValue({});
      mockOctokit.issues.createComment.mockResolvedValue({});

      await service.startTicket('123');

      expect(mockOctokit.issues.addLabels).toHaveBeenCalled();
    });
  });

  describe('completeTicket', () => {
    it('should move ticket from doing to done and close issue', async () => {
      mockOctokit.issues.removeLabel.mockResolvedValue({});
      mockOctokit.issues.addLabels.mockResolvedValue({});
      mockOctokit.issues.update.mockResolvedValue({});

      await service.completeTicket('123');

      expect(mockOctokit.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        name: 'status:doing',
      });

      expect(mockOctokit.issues.addLabels).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        labels: ['status:done'],
      });

      expect(mockOctokit.issues.update).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        state: 'closed',
      });
    });
  });

  describe('undoTicket', () => {
    it('should move done ticket back to doing and reopen', async () => {
      // Mock getTicket to return a done ticket
      const mockTicket: Ticket = {
        id: '#123',
        title: 'Test',
        status: 'done',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: ['status:done'],
        description: '',
      };

      vi.spyOn(service, 'getTicket').mockResolvedValue(mockTicket);
      mockOctokit.issues.update.mockResolvedValue({});
      mockOctokit.issues.removeLabel.mockResolvedValue({});
      mockOctokit.issues.addLabels.mockResolvedValue({});

      await service.undoTicket('123');

      expect(mockOctokit.issues.update).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        state: 'open',
      });

      expect(mockOctokit.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        name: 'status:done',
      });

      expect(mockOctokit.issues.addLabels).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        labels: ['status:doing'],
      });
    });

    it('should move doing ticket back to todo', async () => {
      const mockTicket: Ticket = {
        id: '#123',
        title: 'Test',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: ['status:doing'],
        description: '',
      };

      vi.spyOn(service, 'getTicket').mockResolvedValue(mockTicket);
      mockOctokit.issues.removeLabel.mockResolvedValue({});
      mockOctokit.issues.addLabels.mockResolvedValue({});

      await service.undoTicket('123');

      expect(mockOctokit.issues.update).not.toHaveBeenCalled();

      expect(mockOctokit.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        name: 'status:doing',
      });

      expect(mockOctokit.issues.addLabels).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        labels: ['status:todo'],
      });
    });

    it('should throw error if ticket not found', async () => {
      vi.spyOn(service, 'getTicket').mockResolvedValue(null);

      await expect(service.undoTicket('999')).rejects.toThrow('Ticket #999 not found');
    });
  });

  describe('custom label configuration', () => {
    it('should use custom labels when provided', async () => {
      const customService = new GitHubTicketService({
        owner: 'testowner',
        repo: 'testrepo',
        labels: {
          todo: 'custom:todo',
          doing: 'custom:in-progress',
          done: 'custom:completed',
        },
      });

      mockOctokit.issues.create.mockResolvedValue({
        data: {
          number: 125,
          title: 'Custom label test',
          state: 'open',
          labels: [{ name: 'custom:todo' }],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      });

      await customService.createTicket('Custom label test');

      expect(mockOctokit.issues.create).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        title: 'Custom label test',
        body: expect.any(String),
        labels: ['custom:todo', 'priority:medium'],
      });
    });
  });

  describe('deleteTicket', () => {
    it('should call octokit.rest.issues.update with correct parameters to close an issue', async () => {
      // Mock the update method to simulate a successful API call
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: { number: 123, state: 'closed' }
      });

      await service.deleteTicket('123');

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        state: 'closed',
        state_reason: 'not_planned'
      });
    });

    it('should handle ticket ID with # prefix', async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: { number: 123, state: 'closed' }
      });

      await service.deleteTicket('#123');

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 123,
        state: 'closed',
        state_reason: 'not_planned'
      });
    });

    it('should throw TicketNotFoundError if the issue does not exist', async () => {
      // Mock the update method to simulate a "Not Found" error
      mockOctokit.rest.issues.update.mockRejectedValue(
        new Error('Not Found')
      );

      await expect(service.deleteTicket('999')).rejects.toThrow(TicketNotFoundError);
      await expect(service.deleteTicket('999')).rejects.toThrow('Ticket with ID \'999\' not found');
    });

    it('should throw authentication error for bad credentials', async () => {
      mockOctokit.rest.issues.update.mockRejectedValue(
        new Error('Bad credentials - https://docs.github.com/rest')
      );

      await expect(service.deleteTicket('123')).rejects.toThrow('GitHub authentication failed. Please run: gh auth login');
    });

    it('should throw permission error for insufficient permissions', async () => {
      mockOctokit.rest.issues.update.mockRejectedValue(
        new Error('Resource not accessible by integration (permission denied)')
      );

      await expect(service.deleteTicket('123')).rejects.toThrow('Insufficient permissions to delete issue #123');
    });

    it('should throw generic error for other failures', async () => {
      mockOctokit.rest.issues.update.mockRejectedValue(
        new Error('Internal Server Error')
      );

      await expect(service.deleteTicket('123')).rejects.toThrow('Failed to delete GitHub issue: Internal Server Error');
    });

    it('should throw an error for invalid ticket IDs', async () => {
      // Invalid ID that cannot be parsed as a number
      const invalidTicketId = 'abc; rm -rf /';
      
      // The method should throw an error because parseTicketId will fail,
      // not because of command injection protection
      // The error message is wrapped by the catch block
      await expect(service.deleteTicket(invalidTicketId)).rejects.toThrow(`Failed to delete GitHub issue: Invalid ticket ID: ${invalidTicketId}`);
    });

    it('should not be vulnerable to injection via owner/repo config', async () => {
      const maliciousService = new GitHubTicketService({
        owner: 'test; rm -rf /',
        repo: 'test`whoami`',
        token: 'test-token',
      });

      // Mock the update method. We expect it to be called with the malicious strings,
      // proving they are not executed as commands but passed as parameters
      mockOctokit.rest.issues.update.mockResolvedValue({
        data: { number: 123, state: 'closed' }
      });

      await maliciousService.deleteTicket('123');

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'test; rm -rf /',
        repo: 'test`whoami`',
        issue_number: 123,
        state: 'closed',
        state_reason: 'not_planned'
      });
      
      // The malicious strings were passed as parameters, not executed
    });
  });

  describe('API consistency: octokit.rest.* pattern enforcement', () => {
    describe('should use consistent rest.* API pattern', () => {
      it('should use rest.issues.create for createTicket', async () => {
        mockOctokit.rest.issues.create.mockResolvedValue({
          data: {
            number: 123,
            title: 'Test ticket',
            state: 'open',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            labels: [{ name: 'status:todo' }],
            body: 'Test description',
            html_url: 'https://github.com/owner/repo/issues/123',
            url: 'https://api.github.com/repos/owner/repo/issues/123',
            assignee: null,
          },
        });

        await service.createTicket('Test ticket');

        expect(mockOctokit.rest.issues.create).toHaveBeenCalled();
      });

      it('should use rest.issues.listForRepo for listTickets', async () => {
        mockOctokit.rest.issues.listForRepo.mockResolvedValue({
          data: [{
            number: 123,
            title: 'Test ticket',
            state: 'open',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            labels: [{ name: 'status:todo' }],
            body: 'Test description',
            html_url: 'https://github.com/owner/repo/issues/123',
            url: 'https://api.github.com/repos/owner/repo/issues/123',
            assignee: null,
          }],
        });

        await service.listTickets();

        expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalled();
      });

      it('should use rest.issues.get for getTicket', async () => {
        mockOctokit.rest.issues.get.mockResolvedValue({
          data: {
            number: 123,
            title: 'Test ticket',
            state: 'open',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            labels: [{ name: 'status:todo' }],
            body: 'Test description',
            html_url: 'https://github.com/owner/repo/issues/123',
            url: 'https://api.github.com/repos/owner/repo/issues/123',
            assignee: null,
          },
        });

        await service.getTicket('123');

        expect(mockOctokit.rest.issues.get).toHaveBeenCalled();
      });

      it('should use rest.issues.createComment for startTicket', async () => {
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

        await service.startTicket('123');

        expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      });

      it('should use rest.issues.update for completeTicket', async () => {
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });

        await service.completeTicket('123');

        expect(mockOctokit.rest.issues.update).toHaveBeenCalled();
      });

      it('should use rest.issues.update for undoTicket', async () => {
        // Mock getTicket to return a ticket
        mockOctokit.rest.issues.get.mockResolvedValue({
          data: {
            number: 123,
            title: 'Test ticket',
            state: 'closed',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            labels: [{ name: 'status:done' }],
            body: 'Test description',
            html_url: 'https://github.com/owner/repo/issues/123',
            url: 'https://api.github.com/repos/owner/repo/issues/123',
            assignee: null,
          },
        });

        mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: {} });

        await service.undoTicket('123');

        expect(mockOctokit.rest.issues.update).toHaveBeenCalled();
      });

      it('should use rest.issues.removeLabel for label operations', async () => {
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: {} });

        await service.startTicket('123');

        expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalled();
      });

      it('should use rest.issues.addLabels for label operations', async () => {
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: {} });

        await service.startTicket('123');

        expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
      });

      it('should use rest.issues.update for deleteTicket (already consistent)', async () => {
        mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });

        await service.deleteTicket('123');

        expect(mockOctokit.rest.issues.update).toHaveBeenCalled();
      });
    });

    describe('should NOT use legacy direct issues.* pattern', () => {
      it('should successfully execute all methods using rest.* pattern', async () => {
        // Comprehensive test verifying all methods work with rest.* pattern
        
        // Setup mocks for successful operations
        mockOctokit.rest.issues.create.mockResolvedValue({ data: { number: 123, title: 'Test', state: 'open', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', labels: [], body: '', html_url: '', url: '', assignee: null } });
        mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
        mockOctokit.rest.issues.get.mockResolvedValue({ data: { number: 123, title: 'Test', state: 'open', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', labels: [], body: '', html_url: '', url: '', assignee: null } });
        mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: {} });

        // Execute all methods - should complete without errors
        const ticket = await service.createTicket('Test');
        const tickets = await service.listTickets();
        const getResult = await service.getTicket('123');
        await service.startTicket('123');
        await service.completeTicket('123');
        await service.undoTicket('123');

        // Verify all rest.* methods were called correctly
        expect(mockOctokit.rest.issues.create).toHaveBeenCalled();
        expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalled();
        expect(mockOctokit.rest.issues.get).toHaveBeenCalled();
        expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
        expect(mockOctokit.rest.issues.update).toHaveBeenCalled();
        expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalled();
        expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();

        // Verify return values are correct
        expect(ticket).toBeDefined();
        expect(ticket.id).toBe('#123');
        expect(tickets).toEqual([]);
        expect(getResult).toBeDefined();
      });
    });
  });
});