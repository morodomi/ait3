import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { createTicket } from './create.js';
import { LocalTicketService } from '@/services/implementations/LocalTicketService.js';
import type { Services, CreateTicketArgs } from '@/common/types.js';

describe('createTicket Pure Function', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-create-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Create services container with test ticket service
    services = {
      ticketService: new LocalTicketService(testDir)
    };
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Pure Function Logic', () => {
    it('should create ticket with basic title', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Test Ticket Creation'
      };

      const result = await createTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Ticket created successfully');
      expect(result.message).toContain('Test Ticket Creation');
      expect(result.message).toContain('ID: #0001');
      expect(result.message).toContain('Priority: medium');
      expect(result.message).toContain('Status: todo');
      expect(result.data).toMatchObject({
        id: '0001',
        title: 'Test Ticket Creation',
        status: 'todo',
        priority: 'medium',
        labels: []
      });
    });

    it('should use LOCATION: prefix for location display', async () => {
      const args: CreateTicketArgs = {
        title: 'Test Location Display'
      };

      const result = await createTicket(args, services);

      expect(result.success).toBe(true);
      // Strip ANSI color codes for comparison
      const escapeChar = String.fromCharCode(27); // ESC character
      const ansiRegex = new RegExp(`${escapeChar}\\[[0-9;]*m`, 'g');
      const strippedMessage = result.message.replace(ansiRegex, '');
      expect(strippedMessage).toContain('LOCATION:');
      expect(strippedMessage).not.toContain('Location:');
    });

    it('should create ticket with custom priority', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'High Priority Task',
        priority: 'high'
      };

      const result = await createTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Priority: high');
      expect(result.data.priority).toBe('high');
    });

    it('should create ticket with assignee', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Assigned Task',
        assignee: 'john.doe@example.com'
      };

      const result = await createTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Assignee: john.doe@example.com');
      expect(result.data.assignee).toBe('john.doe@example.com');
    });

    it('should create ticket with labels', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Feature Task',
        labels: ['feature', 'backend', 'urgent']
      };

      const result = await createTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Labels: feature, backend, urgent');
      expect(result.data.labels).toEqual(['feature', 'backend', 'urgent']);
    });

    it('should create ticket with all options', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Complete Feature Task',
        priority: 'critical',
        assignee: 'admin@example.com',
        labels: ['feature', 'core', 'blocking']
      };

      const result = await createTicket(args, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('SUCCESS: Ticket created successfully');
      expect(result.message).toContain('Complete Feature Task');
      expect(result.message).toContain('Priority: critical');
      expect(result.message).toContain('Assignee: admin@example.com');
      expect(result.message).toContain('Labels: feature, core, blocking');
      expect(result.data).toMatchObject({
        title: 'Complete Feature Task',
        priority: 'critical',
        assignee: 'admin@example.com',
        labels: ['feature', 'core', 'blocking']
      });
    });
  });

  describe('Input Validation', () => {
    it('should throw ValidationError for empty title', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: ''
      };

      await expect(
        createTicket(args, services)
      ).rejects.toThrow('Ticket title cannot be empty');
    });

    it('should throw ValidationError for whitespace-only title', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: '   \n\t   '
      };

      await expect(
        createTicket(args, services)
      ).rejects.toThrow('Ticket title cannot be empty');
    });

    it('should throw ValidationError for invalid priority', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Test Task',
        priority: 'invalid' as any
      };

      await expect(
        createTicket(args, services)
      ).rejects.toThrow('Invalid priority');
    });

    it('should throw ValidationError for excessively long title', async () => {
      // This test will fail until createTicket function is implemented
      const longTitle = 'A'.repeat(201); // Exceeds 200 character limit
      const args: CreateTicketArgs = {
        title: longTitle
      };

      await expect(
        createTicket(args, services)
      ).rejects.toThrow('Ticket title cannot exceed 200 characters');
    });
  });

  describe('Message Formatting', () => {
    it('should format success message with proper content', async () => {
      const args: CreateTicketArgs = {
        title: 'Formatting Test'
      };

      const result = await createTicket(args, services);

      // Focus on message content, not color codes
      expect(result.message).toContain('SUCCESS: Ticket created successfully');
      expect(result.message).toContain('ID: #');
      expect(result.message).toContain('Title: Formatting Test');
      expect(result.message).toContain('Priority: medium');
      expect(result.message).toContain('Status: todo');
      expect(result.message).toContain('LOCATION:'); // File location info
    });

    it('should show local file location for LocalTicketService', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Location Test'
      };

      const result = await createTicket(args, services);

      expect(result.message).toMatch(/LOCATION:.*\.tickets\/todo\/0001-location-test\.md/);
    });

    it('should show GitHub URL location for GitHubTicketService', async () => {
      // Mock GitHubTicketService
      const mockGitHubService = {
        createTicket: async () => ({
          id: '#82',
          title: 'GitHub Location Test',
          status: 'todo',
          priority: 'medium',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
          labels: []
        }),
        getConfig: () => ({ owner: 'testowner', repo: 'testrepo' })
      };

      const githubServices: Services = {
        ticketService: mockGitHubService as any
      };

      const args: CreateTicketArgs = {
        title: 'GitHub Location Test'
      };

      const result = await createTicket(args, githubServices);

      expect(result.message).toContain('LOCATION: https://github.com/testowner/testrepo/issues/82');
    });
  });

  describe('Service Integration', () => {
    it('should call ticketService.createTicket with correct parameters', async () => {
      // This test will fail until createTicket function is implemented
      const args: CreateTicketArgs = {
        title: 'Service Integration Test',
        priority: 'high',
        assignee: 'test@example.com',
        labels: ['integration', 'test']
      };

      const result = await createTicket(args, services);

      // Verify that the underlying service was called correctly
      // by checking the returned data matches what we expect
      expect(result.data).toMatchObject({
        title: 'Service Integration Test',
        priority: 'high',
        assignee: 'test@example.com',
        labels: ['integration', 'test']
      });
    });

    it('should handle service errors gracefully', async () => {
      // This test will fail until createTicket function is implemented
      // Create a mock service that throws an error
      const failingServices: Services = {
        ticketService: {
          createTicket: async () => {
            throw new Error('Service unavailable');
          }
        } as any
      };

      const args: CreateTicketArgs = {
        title: 'Error Test'
      };

      await expect(
        createTicket(args, failingServices)
      ).rejects.toThrow('Failed to create ticket: Service unavailable');
    });
  });
});