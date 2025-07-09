import { Octokit } from '@octokit/rest';
import type { TicketService } from '../interfaces/TicketService.js';
import type { Ticket, CreateTicketOptions } from '../../common/types.js';

interface GitHubConfig {
  owner: string;
  repo: string;
  token?: string;
  labels?: {
    todo?: string;
    doing?: string;
    done?: string;
  };
}

export class GitHubTicketService implements TicketService {
  private octokit: Octokit;
  private config: Required<GitHubConfig>;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token || process.env.GITHUB_TOKEN,
    });

    this.config = {
      owner: config.owner,
      repo: config.repo,
      token: config.token || process.env.GITHUB_TOKEN || '',
      labels: {
        todo: config.labels?.todo || 'status:todo',
        doing: config.labels?.doing || 'status:doing',
        done: config.labels?.done || 'status:done',
        ...config.labels,
      },
    };
  }

  async createTicket(title: string, options?: CreateTicketOptions): Promise<Ticket> {
    const body = this.formatTicketBody(options);
    
    const response = await this.octokit.issues.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title,
      body,
      labels: [
        this.config.labels.todo as string,
        ...(options?.priority ? [`priority:${options.priority}`] : ['priority:medium']),
        ...(options?.labels || []),
      ],
    });

    return this.issueToTicket(response.data);
  }

  async listTickets(options?: { status?: string; priority?: string }): Promise<Ticket[]> {
    const labels: string[] = [];
    
    if (options?.status) {
      const statusKey = options.status as 'todo' | 'doing' | 'done';
      const statusLabel = this.config.labels[statusKey];
      if (statusLabel) labels.push(statusLabel);
    }
    
    if (options?.priority) {
      labels.push(`priority:${options.priority}`);
    }

    const response = await this.octokit.issues.listForRepo({
      owner: this.config.owner,
      repo: this.config.repo,
      labels: labels.length > 0 ? labels.join(',') : undefined,
      state: 'all',
      per_page: 100,
    });

    return response.data.map(issue => this.issueToTicket(issue));
  }

  async getTicket(id: string): Promise<Ticket | null> {
    try {
      const issueNumber = this.parseTicketId(id);
      const response = await this.octokit.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      });

      return this.issueToTicket(response.data);
    } catch (error: unknown) {
      if ((error as {status?: number}).status === 404) {
        return null;
      }
      throw error;
    }
  }

  async startTicket(id: string): Promise<void> {
    const issueNumber = this.parseTicketId(id);
    
    // Remove todo label and add doing label
    await this.updateLabels(issueNumber, 'todo', 'doing');
    
    // Add a comment to indicate work has started
    await this.octokit.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
      body: '🚀 Work started on this ticket',
    });
  }

  async completeTicket(id: string): Promise<void> {
    const issueNumber = this.parseTicketId(id);
    
    // Remove doing label and add done label
    await this.updateLabels(issueNumber, 'doing', 'done');
    
    // Close the issue
    await this.octokit.issues.update({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
      state: 'closed',
    });
  }

  async undoTicket(id: string): Promise<void> {
    const issueNumber = this.parseTicketId(id);
    const issue = await this.getTicket(id);
    
    if (!issue) {
      throw new Error(`Ticket #${id} not found`);
    }

    // Determine current status and move to previous status
    const currentStatus = this.getTicketStatus(issue);
    
    if (currentStatus === 'done') {
      // Reopen the issue and move to doing
      await this.octokit.issues.update({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        state: 'open',
      });
      await this.updateLabels(issueNumber, 'done', 'doing');
    } else if (currentStatus === 'doing') {
      // Move back to todo
      await this.updateLabels(issueNumber, 'doing', 'todo');
    }
  }

  private async updateLabels(issueNumber: number, fromStatus: string, toStatus: string): Promise<void> {
    const fromLabel = this.config.labels[fromStatus as 'todo' | 'doing' | 'done'];
    const toLabel = this.config.labels[toStatus as 'todo' | 'doing' | 'done'];

    if (fromLabel) {
      try {
        await this.octokit.issues.removeLabel({
          owner: this.config.owner,
          repo: this.config.repo,
          issue_number: issueNumber,
          name: fromLabel,
        });
      } catch (error: unknown) {
        // Ignore if label doesn't exist
        if ((error as {status?: number}).status !== 404) throw error;
      }
    }

    if (toLabel) {
      await this.octokit.issues.addLabels({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        labels: [toLabel],
      });
    }
  }

  private formatTicketBody(options?: CreateTicketOptions): string {
    const sections: string[] = [];

    if (options?.description) {
      sections.push('## Description\n');
      sections.push(options.description);
    }

    if (options?.acceptanceCriteria && options.acceptanceCriteria.length > 0) {
      sections.push('\n## Acceptance Criteria\n');
      options.acceptanceCriteria.forEach((criterion: string) => {
        sections.push(`- [ ] ${criterion}`);
      });
    }

    if (options?.technicalRequirements && options.technicalRequirements.length > 0) {
      sections.push('\n## Technical Requirements\n');
      options.technicalRequirements.forEach((req: string) => {
        sections.push(`- ${req}`);
      });
    }

    sections.push('\n---\n_Created by AIT³_');

    return sections.join('\n');
  }

  private issueToTicket(issue: Record<string, unknown>): Ticket {
    const status = this.getIssueStatus(issue) as 'todo' | 'doing' | 'done';
    const priority = this.getIssuePriority(issue) as 'low' | 'medium' | 'high' | 'critical';

    return {
      id: `#${issue.number}`,
      title: issue.title as string,
      status,
      priority,
      created: issue.created_at as string,
      updated: issue.updated_at as string,
      assignee: (issue.assignee as {login?: string} | null)?.login,
      labels: (issue.labels as Array<{name: string}>).map((label) => label.name),
      description: (issue.body as string) || '',
    };
  }

  private getIssueStatus(issue: Record<string, unknown>): string {
    const labels = (issue.labels as Array<{name: string}>).map((label) => label.name);
    
    if (labels.includes(this.config.labels.done as string)) return 'done';
    if (labels.includes(this.config.labels.doing as string)) return 'doing';
    if (labels.includes(this.config.labels.todo as string)) return 'todo';
    
    // Default based on issue state
    return issue.state === 'closed' ? 'done' : 'todo';
  }

  private getIssuePriority(issue: Record<string, unknown>): string {
    const labels = (issue.labels as Array<{name: string}>).map((label) => label.name);
    
    for (const label of labels) {
      if (label.startsWith('priority:')) {
        return label.replace('priority:', '');
      }
    }
    
    return 'medium';
  }

  private getTicketStatus(ticket: Ticket): string {
    return ticket.status;
  }

  private parseTicketId(id: string): number {
    // Handle both formats: "123" and "#123"
    const numericId = id.replace(/^#/, '');
    const issueNumber = parseInt(numericId, 10);
    
    if (isNaN(issueNumber)) {
      throw new Error(`Invalid ticket ID: ${id}`);
    }
    
    return issueNumber;
  }
}