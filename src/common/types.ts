import type { TicketService } from '../services/interfaces/TicketService.js';
import type { GitService } from '../services/interfaces/GitService.js';
import type { ProjectAnalyzer } from '../services/interfaces/ProjectAnalyzer.js';

export interface Ticket {
  id: string;              // Format: "0001" (4-digit zero-padded)
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created: string;         // ISO 8601 timestamp
  updated: string;         // ISO 8601 timestamp
  started?: string;        // ISO 8601 timestamp - when moved to 'doing'
  completed?: string;      // ISO 8601 timestamp - when moved to 'done'
  assignee?: string;
  labels: string[];
  description?: string;    // Markdown body content
}

export interface CreateTicketOptions {
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
  status?: 'todo' | 'doing' | 'done';
  description?: string;
  acceptanceCriteria?: string[];
  technicalRequirements?: string[];
}

export interface TicketConfig {
  backend: string;
  path: string;
  numbering: {
    format: string;
    increment: number;
    next: number;
  };
  templates: Record<string, string>;
  labels: {
    priority: string[];
    type: string[];
    status: string[];
  };
}

export interface CLIResult {
  success: boolean;
  message: string;
  data?: any;
  exitCode?: number;
}

// CLI Command Argument Types
export interface CreateTicketArgs {
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
}

// Service Container for Dependency Injection
export interface Services {
  ticketService: TicketService;
  gitService?: GitService;
  projectAnalyzer?: ProjectAnalyzer;
  // Future services:
  // projectService?: ProjectService;
}

// Future command arguments (for extension)
export interface ListTicketsArgs {
  status?: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

export interface ShowTicketArgs {
  id: string;
}

export interface StartTicketArgs {
  id: string;
}

export interface CompleteTicketArgs {
  id: string;
}

export interface UndoTicketArgs {
  id: string;
  dryRun?: boolean;
}

// Migration related types
export interface MigrateArgs {
  from: 'local' | 'github';
  to: 'local' | 'github';
  owner?: string;
  repo?: string;
  validate?: boolean;
  dryRun?: boolean;
}

export interface BackendConfig {
  backend: 'local' | 'github';
  local?: {
    path: string;
  };
  github?: {
    owner: string;
    repo: string;
    useGhCli?: boolean;
    labels?: {
      todo?: string;
      doing?: string;
      done?: string;
    };
  };
}