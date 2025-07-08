// Application constants
export const TICKET_CONSTANTS = {
  // File system paths
  DEFAULT_BASE_PATH: '.tickets',
  LOCK_FILE_NAME: '.lock',
  CONFIG_FILE_NAME: 'config.json',
  
  // Directory names
  DIRECTORIES: {
    TODO: 'todo',
    DOING: 'doing',
    DONE: 'done'
  } as const,
  
  // Ticket ID format
  ID_FORMAT: {
    LENGTH: 4,
    PAD_CHAR: '0'
  } as const,
  
  // File locking configuration
  LOCK_CONFIG: {
    RETRIES: 5,
    STALE_TIME: 5000, // 5 seconds
    REALPATH: false
  } as const,
  
  // Validation limits
  VALIDATION: {
    TITLE_MIN_LENGTH: 1,
    TITLE_MAX_LENGTH: 200
  } as const
} as const;

// Default ticket configuration
export const DEFAULT_TICKET_CONFIG = {
  backend: 'local',
  path: '.tickets',
  numbering: {
    format: '0000',
    increment: 1,
    next: 1
  },
  templates: {
    feature: 'templates/feature-ticket.md',
    bug: 'templates/bug-ticket.md',
    task: 'templates/task-ticket.md'
  },
  labels: {
    priority: ['low', 'medium', 'high', 'critical'],
    type: ['feature', 'bug', 'task', 'spike'],
    status: ['todo', 'doing', 'done']
  }
} as const;

// Validation constants
export const VALID_STATUSES = ['todo', 'doing', 'done'] as const;
export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

// Error messages
export const ERROR_MESSAGES = {
  EMPTY_TITLE: 'Ticket title cannot be empty',
  INVALID_PRIORITY: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
  INVALID_STATUS: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
  CONFIG_READ_ERROR: 'Failed to read configuration file',
  CONFIG_WRITE_ERROR: 'Failed to write configuration file',
  DIRECTORY_CREATE_ERROR: 'Failed to create directory structure',
  FILE_WRITE_ERROR: 'Failed to write ticket file',
  FILE_LOCK_ERROR: 'Failed to acquire file lock'
} as const;

