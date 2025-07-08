import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { planPhase } from './plan.js';
import { LocalTicketService } from '@/services/implementations/LocalTicketService.js';
import type { Services } from '@/common/types.js';

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
    it('should generate Claude proposal for feature', async () => {
      const result = await planPhase(
        { 
          featureName: 'user-authentication',
          mode: 'guided'
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Claude Code Instructions');
      expect(result.message).toContain('user-authentication');
    });

    it('should prepare Gemini analysis command', async () => {
      const result = await planPhase(
        { 
          featureName: 'user-auth',
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
      const result = await planPhase(
        { 
          featureName: 'test-feature',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Claude Code Instructions');
      expect(result.message).toContain('Gemini analysis');
      expect(result.message).toContain('ait3 flow red');
    });

    it('should handle missing feature name gracefully', async () => {
      await expect(
        planPhase({ mode: 'guided' }, services)
      ).rejects.toThrow('Feature name is required');
    });
  });

  describe('express mode', () => {
    it('should provide quick Claude proposal only', async () => {
      const result = await planPhase(
        { 
          featureName: 'quick-feature',
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
      const result = await planPhase(
        { 
          featureName: 'manual-feature',
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
    it('should work without ticket ID', async () => {
      const result = await planPhase(
        { 
          featureName: 'standalone-feature',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Claude Code Instructions');
    });

    it('should reference ticket when ID provided', async () => {
      // First create a test ticket
      await services.ticketService.createTicket('Test Planning Feature', {
        priority: 'high',
        assignee: undefined,
        labels: ['test']
      });

      const result = await planPhase(
        { 
          featureName: 'test-feature',
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ticket #0001');
    });

    it('should handle invalid ticket ID gracefully', async () => {
      const result = await planPhase(
        { 
          featureName: 'test-feature',
          ticketId: '9999',
          mode: 'guided' 
        },
        services
      );

      // Should still succeed but show ticket ID in message
      expect(result.success).toBe(true);
      expect(result.message).toContain('Ticket #');
      expect(result.message).toContain('Claude Code Instructions');
    });
  });

  describe('requirements integration', () => {
    it('should include requirements in proposal when provided', async () => {
      const result = await planPhase(
        { 
          featureName: 'secure-auth',
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
      const result = await planPhase(
        { 
          featureName: 'simple-feature',
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
          featureName: 'test-feature',
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Location');
      expect(result.message).toContain('.tickets/doing/0001-');
    });

    it('should include structured Next Action section', async () => {
      const result = await planPhase(
        { 
          featureName: 'test-feature',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Next Action');
      expect(result.message).toContain('├─ Analyze ticket:');
      expect(result.message).toContain('│  └─ Read');
      expect(result.message).toContain('.tickets/doing/001-test-feature.md');
      expect(result.message).toContain('├─ Research codebase:');
      expect(result.message).toContain('│  └─ Understand existing patterns');
      expect(result.message).toContain('├─ Propose approach:');
      expect(result.message).toContain('│  └─ Document technical design');
      expect(result.message).toContain('├─ Validate with Gemini (optional):');
      expect(result.message).toContain('└─ Commit design:');
    });

    it('should include git commit recommendation', async () => {
      const result = await planPhase(
        { 
          featureName: 'test-feature',
          ticketId: '0001',
          mode: 'guided' 
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('└─ Commit design:');
      expect(result.message).toContain('git commit -m "planning(#001): test-feature design"');
    });
  });
});