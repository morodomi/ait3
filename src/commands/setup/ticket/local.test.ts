import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTicketLocal } from './local.js';
import type { Services } from '../../../common/types.js';
import { mkdtemp, rm, writeFile, mkdir, readFile as fsReadFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

describe('setupTicketLocal', () => {
  let testDir: string;
  let services: Services;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-setup-ticket-local-${hash}-`);
    testDir = await mkdtemp(prefix);

    // Create .tickets directory
    await mkdir(join(testDir, '.tickets'), { recursive: true });
    await writeFile(
      join(testDir, '.tickets', 'config.json'),
      JSON.stringify({
        backend: 'github',
        path: '.tickets',
        numbering: { format: '0000', increment: 1, next: 1 },
        github: {
          owner: 'testowner',
          repo: 'testrepo',
          remote: 'origin'
        }
      }, null, 2)
    );

    services = {
      ticketService: {
        listTickets: vi.fn().mockResolvedValue([]),
      } as any,
      gitService: {} as any,
      projectAnalyzer: {} as any,
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('configuration update', () => {
    it('should update config.json to local backend', async () => {
      const result = await setupTicketLocal({}, services, { cwd: testDir });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Local ticket backend configured successfully');

      const config = JSON.parse(
        await fsReadFile(join(testDir, '.tickets', 'config.json'), 'utf-8')
      );

      expect(config.backend).toBe('local');
      // GitHub config should be preserved for potential switch back
      expect(config.github).toBeDefined();
      expect(config.github.owner).toBe('testowner');
    });

    it('should detect and notify about existing GitHub issues', async () => {
      services.ticketService.listTickets = vi.fn().mockResolvedValue([
        { id: '001', title: 'GitHub issue 1' },
        { id: '002', title: 'GitHub issue 2' },
        { id: '003', title: 'GitHub issue 3' },
        { id: '004', title: 'GitHub issue 4' },
        { id: '005', title: 'GitHub issue 5' }
      ]);

      const result = await setupTicketLocal({}, services, { cwd: testDir });

      expect(result.success).toBe(true);
      expect(result.data?.details).toContain('Found 5 GitHub issues');
      expect(result.data?.details).toContain('Use \'ait3 migrate\' to transfer them');
    });

    it('should handle already configured as local', async () => {
      // Pre-configure as local
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({
          backend: 'local',
          path: '.tickets',
        }, null, 2)
      );

      const result = await setupTicketLocal({}, services, { cwd: testDir });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Already configured for local backend');
    });
  });

  describe('error handling', () => {
    it('should handle missing .tickets directory', async () => {
      const emptyDir = await mkdtemp(join(tmpdir(), 'test-empty-'));

      const result = await setupTicketLocal({}, services, { cwd: emptyDir });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No .tickets directory found');
      expect(result.data?.details).toContain('ait3 ticket create');

      await rm(emptyDir, { recursive: true, force: true });
    });

    it('should handle config.json read errors gracefully', async () => {
      // Create invalid JSON
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        'invalid json content'
      );

      const result = await setupTicketLocal({}, services, { cwd: testDir });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to read configuration');
    });
  });

  describe('options', () => {
    it('should force setup even if already configured', async () => {
      // Pre-configure as local
      await writeFile(
        join(testDir, '.tickets', 'config.json'),
        JSON.stringify({ backend: 'local' }, null, 2)
      );

      const result = await setupTicketLocal(
        { force: true }, 
        services, 
        { cwd: testDir }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Local ticket backend configured successfully');
      // Should not show "already configured" message with force flag
      expect(result.message).not.toContain('Already configured');
    });
  });
});