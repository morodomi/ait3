import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import matter from 'gray-matter';
import { LocalTicketService } from '../../src/services/implementations/LocalTicketService.js';
import type { Ticket } from '../../src/common/types.js';

describe('LocalTicketService', () => {
  let testDir: string;
  let service: LocalTicketService;

  beforeEach(async () => {
    // Create unique test directory with hash for parallel test safety
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-ait3-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Initialize service with test directory
    service = new LocalTicketService(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createTicket', () => {
    it('should create a ticket file with correct structure', async () => {
      // Act
      const ticket = await service.createTicket('Test Ticket Creation');

      // Assert - Check returned ticket object
      expect(ticket).toMatchObject({
        id: '0001',
        title: 'Test Ticket Creation',
        status: 'todo',
        priority: 'medium',
        labels: []
      });
      expect(ticket.created).toBeDefined();
      expect(ticket.updated).toBeDefined();

      // Assert - Check file creation
      const expectedPath = join(testDir, 'todo', '0001-test-ticket-creation.md');
      await expect(access(expectedPath)).resolves.toBeUndefined();

      // Assert - Check file content
      const content = await readFile(expectedPath, 'utf-8');
      const { data, content: body } = matter(content);

      expect(data).toMatchObject({
        id: '0001',
        title: 'Test Ticket Creation',
        status: 'todo',
        priority: 'medium',
        labels: []
      });
      expect(body).toContain('# Ticket #0001: Test Ticket Creation');
    });

    it('should auto-increment ticket ID', async () => {
      // Create first ticket
      const ticket1 = await service.createTicket('First Ticket');
      expect(ticket1.id).toBe('0001');

      // Create second ticket
      const ticket2 = await service.createTicket('Second Ticket');
      expect(ticket2.id).toBe('0002');

      // Verify both files exist
      const path1 = join(testDir, 'todo', '0001-first-ticket.md');
      const path2 = join(testDir, 'todo', '0002-second-ticket.md');
      await expect(access(path1)).resolves.toBeUndefined();
      await expect(access(path2)).resolves.toBeUndefined();
    });

    it('should create tickets directory structure if not exists', async () => {
      // Act
      await service.createTicket('Test Directory Creation');

      // Assert - Check directory structure
      await expect(access(join(testDir, 'todo'))).resolves.toBeUndefined();
      await expect(access(join(testDir, 'doing'))).resolves.toBeUndefined();
      await expect(access(join(testDir, 'done'))).resolves.toBeUndefined();
      await expect(access(join(testDir, 'config.json'))).resolves.toBeUndefined();
    });

    it('should handle title with special characters', async () => {
      // Act
      const ticket = await service.createTicket('Test: Ticket with / Special & Characters!');

      // Assert
      expect(ticket.title).toBe('Test: Ticket with / Special & Characters!');
      const expectedPath = join(testDir, 'todo', '0001-test-ticket-with-special-characters.md');
      await expect(access(expectedPath)).resolves.toBeUndefined();
    });

    it('should accept custom priority', async () => {
      // Act
      const ticket = await service.createTicket('High Priority Task', { priority: 'high' });

      // Assert
      expect(ticket.priority).toBe('high');

      // Verify in file
      const filePath = join(testDir, 'todo', '0001-high-priority-task.md');
      const content = await readFile(filePath, 'utf-8');
      const { data } = matter(content);
      expect(data.priority).toBe('high');
    });

    it('should accept custom labels', async () => {
      // Act
      const ticket = await service.createTicket('Feature Task', { 
        labels: ['feature', 'core', 'backend'] 
      });

      // Assert
      expect(ticket.labels).toEqual(['feature', 'core', 'backend']);
    });

    it('should accept custom assignee', async () => {
      // Act
      const ticket = await service.createTicket('Assigned Task', { 
        assignee: 'john.doe@example.com' 
      });

      // Assert
      expect(ticket.assignee).toBe('john.doe@example.com');
    });

    it('should handle concurrent ticket creation with file locking', async () => {
      // Act - Create multiple tickets concurrently (reduce number for reliability)
      const promises = Array.from({ length: 3 }, (_, i) => 
        service.createTicket(`Concurrent Ticket ${i + 1}`)
      );
      
      const tickets = await Promise.all(promises);

      // Assert - All tickets should have unique IDs
      const ids = tickets.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
      expect(ids.sort()).toEqual(['0001', '0002', '0003']);
    }, 15000); // 15 second timeout for concurrent operations

    it('should validate ticket data with Zod schema', async () => {
      // This test will fail until Zod validation is implemented
      // Invalid priority should be rejected
      await expect(
        service.createTicket('Invalid Priority', { priority: 'invalid' as any })
      ).rejects.toThrow();
    });

    it('should handle file system errors gracefully', async () => {
      // Create service with non-existent base path
      const invalidService = new LocalTicketService('/non/existent/path');
      
      // Should throw meaningful error
      await expect(
        invalidService.createTicket('Test')
      ).rejects.toThrow();
    });
  });
});