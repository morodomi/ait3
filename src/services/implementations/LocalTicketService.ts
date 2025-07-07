import { mkdir, writeFile, readFile, access, readdir, rename, rm } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { lock } from 'proper-lockfile';
import type { TicketService } from '../interfaces/TicketService.js';
import type { Ticket, CreateTicketOptions, TicketConfig } from '../../common/types.js';
import { TICKET_CONSTANTS, DEFAULT_TICKET_CONFIG, ERROR_MESSAGES } from '../../common/constants.js';
import { ValidationError, FileSystemError, ConfigurationError, LockError, TicketNotFoundError, TicketAlreadyInProgressError, TicketAlreadyCompletedError } from '../../common/errors.js';
import { TimeUtils, IDUtils, FileUtils } from '../../common/utils.js';

// Zod schema for validation
const TicketSchema = z.object({
  id: z.string().regex(/^\d{4}$/),
  title: z.string().min(TICKET_CONSTANTS.VALIDATION.TITLE_MIN_LENGTH).max(TICKET_CONSTANTS.VALIDATION.TITLE_MAX_LENGTH),
  status: z.enum(['todo', 'doing', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  assignee: z.string().optional(),
  labels: z.array(z.string())
});

export class LocalTicketService implements TicketService {
  private basePath: string;

  constructor(basePath: string = TICKET_CONSTANTS.DEFAULT_BASE_PATH) {
    this.basePath = basePath;
  }

  async createTicket(title: string, options: CreateTicketOptions = {}): Promise<Ticket> {
    // Validate inputs
    if (!title || title.trim().length === 0) {
      throw new ValidationError(ERROR_MESSAGES.EMPTY_TITLE, 'title');
    }

    // Default options
    const {
      priority = 'medium',
      assignee,
      labels = [],
      status = 'todo'
    } = options;

    // Use file locking for safe ID generation
    const lockPath = join(this.basePath, TICKET_CONSTANTS.LOCK_FILE_NAME);
    await this.ensureDirectoryStructure();
    
    let release;
    try {
      release = await lock(this.basePath, { 
        lockfilePath: lockPath,
        retries: TICKET_CONSTANTS.LOCK_CONFIG.RETRIES,
        stale: TICKET_CONSTANTS.LOCK_CONFIG.STALE_TIME,
        realpath: TICKET_CONSTANTS.LOCK_CONFIG.REALPATH
      });
    } catch (error) {
      throw new LockError(`${ERROR_MESSAGES.FILE_LOCK_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Generate next ID and create ticket atomically
      const config = await this.readConfig();
      const nextId = IDUtils.formatTicketId(config.numbering.next, TICKET_CONSTANTS.ID_FORMAT.LENGTH);
      
      // Create ticket object
      const now = TimeUtils.now();
      const ticket: Ticket = {
        id: nextId,
        title: title.trim(),
        status,
        priority,
        created: now,
        updated: now,
        assignee,
        labels: [...labels]
      };

      // Validate with Zod
      let validatedTicket;
      try {
        validatedTicket = TicketSchema.parse(ticket);
      } catch (error) {
        throw new ValidationError(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Generate filename from title
      const filename = FileUtils.generateTicketFilename(nextId, title);
      const filePath = join(this.basePath, status, filename);

      // Create file content
      const content = this.generateFileContent(validatedTicket);

      // Write file
      try {
        await writeFile(filePath, content, 'utf-8');
      } catch (error) {
        throw new FileSystemError(`${ERROR_MESSAGES.FILE_WRITE_ERROR}: ${error instanceof Error ? error.message : String(error)}`, filePath);
      }

      // Update config with next ID
      await this.updateConfig(config, nextId);

      return validatedTicket;
    } finally {
      await release();
    }
  }

  private async ensureDirectoryStructure(): Promise<void> {
    try {
      // Create base directories
      await mkdir(this.basePath, { recursive: true });
      await mkdir(join(this.basePath, TICKET_CONSTANTS.DIRECTORIES.TODO), { recursive: true });
      await mkdir(join(this.basePath, TICKET_CONSTANTS.DIRECTORIES.DOING), { recursive: true });
      await mkdir(join(this.basePath, TICKET_CONSTANTS.DIRECTORIES.DONE), { recursive: true });

      // Create config if it doesn't exist
      const configPath = join(this.basePath, TICKET_CONSTANTS.CONFIG_FILE_NAME);
      try {
        await access(configPath);
      } catch {
        await writeFile(configPath, JSON.stringify(DEFAULT_TICKET_CONFIG, null, 2), 'utf-8');
      }
    } catch (error) {
      throw new FileSystemError(`${ERROR_MESSAGES.DIRECTORY_CREATE_ERROR}: ${error instanceof Error ? error.message : String(error)}`, this.basePath);
    }
  }

  private async readConfig(): Promise<TicketConfig> {
    const configPath = join(this.basePath, TICKET_CONSTANTS.CONFIG_FILE_NAME);
    try {
      const configContent = await readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new ConfigurationError(`${ERROR_MESSAGES.CONFIG_READ_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async updateConfig(config: TicketConfig, currentId: string): Promise<void> {
    const configPath = join(this.basePath, TICKET_CONSTANTS.CONFIG_FILE_NAME);
    try {
      const currentIdNum = parseInt(currentId, 10);
      config.numbering.next = currentIdNum + config.numbering.increment;
      
      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new ConfigurationError(`${ERROR_MESSAGES.CONFIG_WRITE_ERROR}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  private generateFileContent(ticket: Ticket): string {
    const frontmatter = {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      created: ticket.created,
      updated: ticket.updated,
      labels: ticket.labels
    };

    if (ticket.assignee) {
      (frontmatter as any).assignee = ticket.assignee;
    }

    // Use gray-matter to create content with YAML frontmatter
    const content = matter.stringify(
      `# Ticket #${ticket.id}: ${ticket.title}\n\n## Description\n\n[Add ticket description here]\n`,
      frontmatter
    );

    return content;
  }

  async listTickets(options?: { status?: string; priority?: string }): Promise<Ticket[]> {
    try {
      await this.ensureDirectoryStructure();

      const tickets: Ticket[] = [];
      const directories = [
        TICKET_CONSTANTS.DIRECTORIES.TODO,
        TICKET_CONSTANTS.DIRECTORIES.DOING,
        TICKET_CONSTANTS.DIRECTORIES.DONE
      ];

      for (const dir of directories) {
        const dirPath = join(this.basePath, dir);
        try {
          const files = await readdir(dirPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              try {
                const filePath = join(dirPath, file);
                const content = await readFile(filePath, 'utf-8');
                const { data } = matter(content);
                
                // Validate with Zod
                const ticket = TicketSchema.parse(data);
                tickets.push(ticket);
              } catch (error) {
                // Skip invalid ticket files
                continue;
              }
            }
          }
        } catch (error) {
          // Skip if directory doesn't exist or can't be read
          continue;
        }
      }

      // Apply filters
      let filtered = tickets;
      
      if (options?.status) {
        filtered = filtered.filter(ticket => ticket.status === options.status);
      }
      
      if (options?.priority) {
        filtered = filtered.filter(ticket => ticket.priority === options.priority);
      }

      return filtered;
    } catch (error) {
      throw new FileSystemError(`Failed to list tickets: ${error instanceof Error ? error.message : String(error)}`, this.basePath);
    }
  }

  async getTicket(id: string): Promise<Ticket | null> {
    try {
      await this.ensureDirectoryStructure();

      // Efficient search: Check each status directory for file starting with ID
      const directories = [
        TICKET_CONSTANTS.DIRECTORIES.TODO,
        TICKET_CONSTANTS.DIRECTORIES.DOING,
        TICKET_CONSTANTS.DIRECTORIES.DONE
      ];

      for (const dir of directories) {
        const dirPath = join(this.basePath, dir);
        try {
          const files = await readdir(dirPath);
          
          // Find file that starts with the given ID
          const targetFile = files.find(file => 
            file.endsWith('.md') && file.startsWith(`${id}-`)
          );
          
          if (targetFile) {
            try {
              const filePath = join(dirPath, targetFile);
              const content = await readFile(filePath, 'utf-8');
              const { data, content: markdownContent } = matter(content);
              
              // Validate with Zod and add description from markdown content
              const ticket = TicketSchema.parse(data);
              
              // Extract description from markdown content (everything after ## Description)
              const descriptionMatch = markdownContent.match(/^# [^]*?\n\n## Description\n*\n*([\s\S]*?)$/);
              const description = descriptionMatch 
                ? descriptionMatch[1].trim()
                : markdownContent.replace(/^# [^]*?\n\n/, '').trim();
              
              return {
                ...ticket,
                description: description || undefined
              };
            } catch (error) {
              // Skip invalid ticket files
              continue;
            }
          }
        } catch (error) {
          // Skip if directory doesn't exist or can't be read
          continue;
        }
      }

      // Ticket not found in any directory
      return null;
    } catch (error) {
      throw new FileSystemError(`Failed to get ticket: ${error instanceof Error ? error.message : String(error)}`, this.basePath);
    }
  }

  async startTicket(id: string): Promise<void> {
    try {
      await this.ensureDirectoryStructure();

      // Find the ticket in all directories to check current status
      const directories = [
        TICKET_CONSTANTS.DIRECTORIES.TODO,
        TICKET_CONSTANTS.DIRECTORIES.DOING,
        TICKET_CONSTANTS.DIRECTORIES.DONE
      ];

      let currentStatus: string | null = null;
      let currentFilePath: string | null = null;
      let targetFilename: string | null = null;

      // Search for the ticket across all status directories
      for (const dir of directories) {
        const dirPath = join(this.basePath, dir);
        try {
          const files = await readdir(dirPath);
          const targetFile = files.find(file => 
            file.endsWith('.md') && file.startsWith(`${id}-`)
          );
          
          if (targetFile) {
            currentStatus = dir;
            currentFilePath = join(dirPath, targetFile);
            targetFilename = targetFile;
            break;
          }
        } catch (error) {
          // Skip if directory doesn't exist or can't be read
          continue;
        }
      }

      // Check if ticket exists
      if (!currentStatus || !currentFilePath || !targetFilename) {
        throw new TicketNotFoundError(id);
      }

      // Validate current status - prevent starting already started or completed tickets
      if (currentStatus === TICKET_CONSTANTS.DIRECTORIES.DOING) {
        throw new TicketAlreadyInProgressError(id);
      }
      
      if (currentStatus === TICKET_CONSTANTS.DIRECTORIES.DONE) {
        throw new TicketAlreadyCompletedError(id);
      }

      // Only allow starting tickets from 'todo' status
      if (currentStatus !== TICKET_CONSTANTS.DIRECTORIES.TODO) {
        throw new ValidationError(`Cannot start ticket from '${currentStatus}' status`);
      }

      // Read and update ticket content
      const content = await readFile(currentFilePath, 'utf-8');
      const { data, content: markdownContent } = matter(content);

      // Update metadata
      const now = TimeUtils.now();
      const updatedData = {
        ...data,
        status: 'doing',
        updated: now,
        started: now  // Use same timestamp
      };

      // Generate updated file content
      const updatedContent = matter.stringify(markdownContent, updatedData);

      // Move file from todo to doing directory atomically
      const targetPath = join(this.basePath, TICKET_CONSTANTS.DIRECTORIES.DOING, targetFilename);
      
      // Write updated content to new location
      await writeFile(targetPath, updatedContent, 'utf-8');
      
      // Remove original file - using unlink for atomic operation
      try {
        await rename(currentFilePath, `${currentFilePath}.tmp`);
        await rm(`${currentFilePath}.tmp`, { force: true });
      } catch (error) {
        // If removal fails, try to clean up the target file
        try {
          await rm(targetPath, { force: true });
        } catch {
          // Ignore cleanup errors
        }
        throw new FileSystemError(`Failed to move ticket file: ${error instanceof Error ? error.message : String(error)}`, currentFilePath);
      }

    } catch (error) {
      // Re-throw specific errors as-is
      if (error instanceof TicketNotFoundError || 
          error instanceof TicketAlreadyInProgressError ||
          error instanceof TicketAlreadyCompletedError ||
          error instanceof ValidationError ||
          error instanceof FileSystemError) {
        throw error;
      }
      
      // Wrap other errors
      throw new FileSystemError(`Failed to start ticket: ${error instanceof Error ? error.message : String(error)}`, this.basePath);
    }
  }
}