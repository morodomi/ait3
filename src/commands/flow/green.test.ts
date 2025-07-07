import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { greenPhase } from './green.js';
import { LocalTicketService } from '@/services/implementations/LocalTicketService.js';
import type { Services } from '@/common/types.js';

describe('greenPhase Pure Function', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-green-${hash}-`);
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

  describe('basic functionality', () => {
    it('should validate ticketId is required', async () => {
      await expect(
        greenPhase({ ticketId: '' }, services)
      ).rejects.toThrow('Ticket ID is required');
    });

    it('should validate ticket exists', async () => {
      await expect(
        greenPhase({ ticketId: '9999' }, services)
      ).rejects.toThrow("Ticket with ID '9999' not found");
    });

    it('should reject tickets not in doing status', async () => {
      // Create ticket in todo status
      await services.ticketService.createTicket('Test feature', {
        priority: 'high'
      });

      await expect(
        greenPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 must be in progress');
    });

    it('should show progress for valid ticket', async () => {
      // Create and start ticket
      await services.ticketService.createTicket('Test feature');
      await services.ticketService.startTicket('0001');

      const result = await greenPhase({ ticketId: '0001' }, services);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('GREEN Phase');
      expect(result.message).toContain('Making tests pass');
      expect(result.message).toContain('Test Progress');
    });
  });

  describe('test detection and analysis', () => {
    beforeEach(async () => {
      // Create and start a test ticket
      await services.ticketService.createTicket('Feature with tests', {
        priority: 'high',
        labels: ['feature']
      });
      await services.ticketService.startTicket('0001');
    });

    it('should detect related test files', async () => {
      const result = await greenPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found test files');
      expect(result.message).toContain('Analyzing test requirements');
    });

    it('should run tests and show initial failure status', async () => {
      const result = await greenPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Initial test status');
      expect(result.message).toContain('Failing:');
      expect(result.message).toContain('0%'); // Initially all tests fail
    });

    it('should analyze test patterns and generate implementation plan', async () => {
      const result = await greenPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Implementation plan');
      expect(result.message).toContain('Functions to implement');
    });
  });

  describe('strict mode (test immutability)', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Strict mode test');
      await services.ticketService.startTicket('0001');
    });

    it('should detect test modifications by default', async () => {
      // Simulate test file modification during green phase
      const result = await greenPhase(
        { ticketId: '0001', strict: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Strict mode enabled');
      expect(result.message).toContain('Test files are immutable');
    });

    it('should warn when test files are modified', async () => {
      // Mock file modification detection
      const mockTestFile = 'tests/example.test.ts';
      
      const result = await greenPhase(
        { 
          ticketId: '0001',
          strict: true,
          // Simulate modified test
          _testModified: mockTestFile
        } as any,
        services
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('WARNING: Test file modification detected');
      expect(result.message).toContain(mockTestFile);
      expect(result.message).toContain('Go back to RED phase');
    });

    it('should allow disabling strict mode', async () => {
      const result = await greenPhase(
        { ticketId: '0001', strict: false },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Strict mode disabled');
      expect(result.message).toContain('Test modifications allowed');
    });
  });

  describe('verbose mode', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Verbose test');
      await services.ticketService.startTicket('0001');
    });

    it('should show detailed progress in verbose mode', async () => {
      const result = await greenPhase(
        { ticketId: '0001', verbose: true },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Verbose mode');
      expect(result.message).toContain('Detailed test analysis');
      expect(result.message).toContain('Step-by-step progress');
    });

    it('should show minimal output without verbose mode', async () => {
      const result = await greenPhase(
        { ticketId: '0001', verbose: false },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('Detailed test analysis');
      expect(result.message).toContain('Test Progress'); // Still shows summary
    });
  });

  describe('target test option', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Target test feature');
      await services.ticketService.startTicket('0001');
    });

    it('should focus on specific test file when target is provided', async () => {
      const targetTest = 'tests/example.test.ts';
      const result = await greenPhase(
        { 
          ticketId: '0001',
          target: targetTest
        },
        services
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Targeting specific test');
      expect(result.message).toContain(targetTest);
    });

    it('should validate target test file exists', async () => {
      await expect(
        greenPhase(
          { 
            ticketId: '0001',
            target: 'tests/nonexistent.test.ts'
          },
          services
        )
      ).rejects.toThrow('Target test file not found');
    });
  });

  describe('implementation generation', () => {
    beforeEach(async () => {
      await services.ticketService.createTicket('Implementation test');
      await services.ticketService.startTicket('0001');
    });

    it('should generate minimal implementation to pass tests', async () => {
      const result = await greenPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Generated implementation');
      expect(result.message).toContain('Minimal code to pass tests');
    });

    it('should follow existing code patterns', async () => {
      const result = await greenPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Following patterns');
      expect(result.message).toContain('Pure functions');
      expect(result.message).toContain('service injection');
    });

    it('should achieve 100% test pass rate', async () => {
      const result = await greenPhase({ ticketId: '0001' }, services);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Final test results');
      expect(result.message).toContain('100% passing');
      expect(result.message).toContain('All tests green');
    });
  });

  describe('error handling', () => {
    it('should handle completed tickets', async () => {
      await services.ticketService.createTicket('Completed feature');
      await services.ticketService.startTicket('0001');
      await services.ticketService.completeTicket('0001');

      await expect(
        greenPhase({ ticketId: '0001' }, services)
      ).rejects.toThrow('Ticket #0001 is already completed');
    });

    it('should handle test execution failures gracefully', async () => {
      await services.ticketService.createTicket('Test failure');
      await services.ticketService.startTicket('0001');

      // Simulate test execution failure
      const result = await greenPhase(
        { 
          ticketId: '0001',
          _forceTestError: true
        } as any,
        services
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Test execution failed');
      expect(result.message).toContain('Check test configuration');
    });
  });
});