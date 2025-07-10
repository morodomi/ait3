import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { planPhase } from './plan.js';
import { LocalTicketService } from '@/services/implementations/LocalTicketService.js';
import type { Services } from '@/common/types.js';

// Helper to strip ANSI color codes for testing
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('planPhase Pure Function', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-plan-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Create services container with test ticket service
    services = {
      ticketService: new LocalTicketService(testDir)
    };
  });

  afterEach(async () => {
    // Clean up test directory completely
    await rm(testDir, { recursive: true, force: true });
  });

  describe('guided mode (default)', () => {
    it('should generate Claude proposal using ticket ID', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('User Authentication', {
        priority: 'high'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided'
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Claude Code Instructions');
      expect(result.message).toContain('user-authentication');
    });

    it('should prepare Gemini analysis command', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('User Auth', {
        priority: 'high'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('gemini -p');
      expect(result.message).toContain('@src/');
      expect(result.message).toContain('user-auth');
    });

    it('should provide user choice options', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Test Feature', {
        priority: 'medium'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Claude Code Instructions');
      expect(result.message).toContain('Gemini analysis');
      expect(result.message).toContain('ait3 flow red');
    });

    it('should show local file location for LocalTicketService', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Location Test', {
        priority: 'medium'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/LOCATION.*\.tickets\/todo\/0001-location-test\.md/);
    });

    it('should use standardized prefixes', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Prefix Test', {
        priority: 'medium'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      const strippedMessage = stripAnsi(result.message);
      
      // Should use TODO: for AI instructions
      expect(strippedMessage).toContain('TODO:');
      expect(strippedMessage).not.toContain('LIST:');
      expect(strippedMessage).not.toContain('Next Action:');
      expect(strippedMessage).not.toContain('Next Action');
    });

    it('should show GitHub URL location for GitHubTicketService', async () => {
      // Mock GitHubTicketService
      const mockGitHubService = {
        getTicket: async () => ({
          id: '#82',
          title: 'GitHub Plan Test',
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

      const result = await planPhase(
        { 
          ticketId: '82',
          mode: 'guided' 
        },
        githubServices
      );

      expect(result.success).toBe(true);
      expect(stripAnsi(result.message)).toContain('LOCATION: https://github.com/testowner/testrepo/issues/82');
    });

    it('should handle missing ticket ID gracefully', async () => {
      await expect(
        planPhase({ ticketId: '', mode: 'guided' }, services)
      ).rejects.toThrow('Invalid ticket ID format');
    });
  });

  describe('express mode', () => {
    it('should provide quick Claude proposal only', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Quick Feature', {
        priority: 'low'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'express' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('PLANNING Phase (Express)');
      expect(result.message).toContain('quick-feature');
      // Should not include interactive choices
      expect(result.message).not.toContain('[1]');
    });
  });

  describe('manual mode', () => {
    it('should provide AIT³ philosophy and guidance only', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Manual Feature', {
        priority: 'medium'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'manual' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('PLANNING Phase (Manual)');
      expect(result.message).toContain('Claude proposes');
      expect(result.message).toContain('Gemini refutes');
      expect(result.message).toContain('Human decides');
    });
  });

  describe('ticket integration', () => {
    it('should accept ticket ID as primary argument', async () => {
      // First create a test ticket
      await services.ticketService.createTicket('Test Planning Feature', {
        priority: 'high',
        assignee: undefined,
        labels: ['test']
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ticket #0001');
    });

    it('should handle invalid ticket ID format', async () => {
      await expect(
        planPhase(
          { 
            ticketId: 'invalid-id',
            mode: 'guided' 
          },
          services
        )
      ).rejects.toThrow('Invalid ticket ID format');
    });

    it('should handle non-existent ticket ID', async () => {
      await expect(
        planPhase(
          { 
            ticketId: '9999',
            mode: 'guided' 
          },
          services
        )
      ).rejects.toThrow('Ticket with ID \'9999\' not found');
    });
  });

  describe('requirements integration', () => {
    it('should include requirements in proposal when provided', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Secure Auth', {
        priority: 'critical'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided',
          requirements: ['security', 'oauth', 'persistence']
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('security');
      expect(result.message).toContain('oauth');
      expect(result.message).toContain('persistence');
    });

    it('should work without requirements', async () => {
      // Create a test ticket
      await services.ticketService.createTicket('Simple Feature', {
        priority: 'low'
      });

      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Claude Code Instructions');
    });
  });

  describe('unified Next Action format', () => {
    it('should display ticket location when ticket ID provided', async () => {
      // Create test ticket
      await services.ticketService.createTicket('Feature for planning');
      await services.ticketService.startTicket('0001');
      
      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('LOCATION');
      expect(result.message).toContain('.tickets/doing/0001-');
    });

    it('should include structured Next Action section', async () => {
      // Create test ticket
      await services.ticketService.createTicket('Test Feature');
      
      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('TODO:');
      expect(result.message).toContain('├─ Analyze ticket:');
      expect(result.message).toContain('│  └─ Read');
      expect(result.message).toContain('.tickets/todo/0001-test-feature.md');
      expect(result.message).toContain('├─ Research codebase:');
      expect(result.message).toContain('│  └─ Understand existing patterns');
      expect(result.message).toContain('├─ Propose approach:');
      expect(result.message).toContain('│  └─ Document technical design');
      expect(result.message).toContain('├─ Validate with Gemini (optional):');
      expect(result.message).toContain('└─ Commit design:');
    });

    it('should include git commit recommendation', async () => {
      // Create test ticket
      await services.ticketService.createTicket('Test Feature');
      
      const result = await planPhase(
        { 
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('└─ Commit design:');
      expect(result.message).toContain('git commit -m "planning(#0001): test-feature design"');
    });
  });
});