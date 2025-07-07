export interface Ticket {
  id: string;              // Format: "0001" (4-digit zero-padded)
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created: string;         // ISO 8601 timestamp
  updated: string;         // ISO 8601 timestamp
  assignee?: string;
  labels: string[];
  description?: string;    // Markdown body content
}

export interface CreateTicketOptions {
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
  status?: 'todo' | 'doing' | 'done';
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
}