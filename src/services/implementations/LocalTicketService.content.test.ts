import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalTicketService } from './LocalTicketService.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import matter from 'gray-matter';

describe('LocalTicketService content extraction', () => {
  let testDir: string;
  let service: LocalTicketService;

  beforeEach(async () => {
    const hash = randomBytes(8).toString('hex');
    const prefix = join(tmpdir(), `test-content-extraction-${hash}-`);
    testDir = await mkdtemp(prefix);
    
    // Create ticket directories
    await mkdir(join(testDir, 'todo'), { recursive: true });
    await mkdir(join(testDir, 'doing'), { recursive: true });
    await mkdir(join(testDir, 'done'), { recursive: true });
    
    service = new LocalTicketService(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getTicket with full content', () => {
    it('should extract full markdown content from ticket', async () => {
      const ticketData = {
        id: '0001',
        title: 'Test ticket with content',
        status: 'todo',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: ['bug', 'urgent']
      };

      const markdownContent = `# Test ticket with content

## Description

This is a detailed description of the ticket.
It contains multiple paragraphs.

And even some **bold** and *italic* text.

## Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2
- [x] Criteria 3 (already done)

## Technical Details

\`\`\`typescript
function example() {
  return 'code block';
}
\`\`\`

## Notes

Additional notes and references.`;

      const fullContent = matter.stringify(markdownContent, ticketData);
      await writeFile(
        join(testDir, 'todo', '0001-test-ticket-with-content.md'),
        fullContent
      );

      const ticket = await service.getTicket('0001');

      expect(ticket).not.toBeNull();
      expect(ticket?.description).toBe(markdownContent.trim());
    });

    it('should handle ticket with only frontmatter', async () => {
      const ticketData = {
        id: '0002',
        title: 'Minimal ticket',
        status: 'todo',
        priority: 'low',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      const fullContent = matter.stringify('', ticketData);
      await writeFile(
        join(testDir, 'todo', '0002-minimal-ticket.md'),
        fullContent
      );

      const ticket = await service.getTicket('0002');

      expect(ticket).not.toBeNull();
      expect(ticket?.description).toBeUndefined();
    });

    it('should extract content with complex markdown formatting', async () => {
      const ticketData = {
        id: '0003',
        title: 'Complex formatting',
        status: 'doing',
        priority: 'medium',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      const markdownContent = `# Complex formatting

> This is a blockquote
> with multiple lines

1. Ordered list item 1
2. Ordered list item 2
   - Nested unordered item
   - Another nested item

---

### Subsection

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |

<details>
<summary>Expandable section</summary>

Hidden content here

</details>`;

      const fullContent = matter.stringify(markdownContent, ticketData);
      await writeFile(
        join(testDir, 'doing', '0003-complex-formatting.md'),
        fullContent
      );

      const ticket = await service.getTicket('0003');

      expect(ticket).not.toBeNull();
      expect(ticket?.description).toBe(markdownContent.trim());
    });

    it('should handle legacy format with ## Description section', async () => {
      const ticketData = {
        id: '0004',
        title: 'Legacy format',
        status: 'done',
        priority: 'high',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      const markdownContent = `# Legacy format

## Description

This is the description section.

## Other Section

This should also be included.`;

      const fullContent = matter.stringify(markdownContent, ticketData);
      await writeFile(
        join(testDir, 'done', '0004-legacy-format.md'),
        fullContent
      );

      const ticket = await service.getTicket('0004');

      expect(ticket).not.toBeNull();
      // Should get full content, not just Description section
      expect(ticket?.description).toBe(markdownContent.trim());
    });

    it('should return undefined description for empty markdown content', async () => {
      const ticketData = {
        id: '0005',
        title: 'Empty content',
        status: 'todo',
        priority: 'low',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        labels: []
      };

      const markdownContent = `# Empty content

`;

      const fullContent = matter.stringify(markdownContent, ticketData);
      await writeFile(
        join(testDir, 'todo', '0005-empty-content.md'),
        fullContent
      );

      const ticket = await service.getTicket('0005');

      expect(ticket).not.toBeNull();
      // Should handle whitespace-only content
      expect(ticket?.description).toBe('# Empty content');
    });
  });
});