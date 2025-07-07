// Custom error types for better error handling
export class TicketError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TicketError';
  }
}

export class ValidationError extends TicketError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends TicketError {
  constructor(message: string, public path?: string) {
    super(message, 'FILESYSTEM_ERROR');
    this.name = 'FileSystemError';
  }
}

export class ConfigurationError extends TicketError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class LockError extends TicketError {
  constructor(message: string) {
    super(message, 'LOCK_ERROR');
    this.name = 'LockError';
  }
}

export class TicketNotFoundError extends TicketError {
  public readonly ticketId: string;
  
  constructor(ticketId: string, message?: string) {
    super(message || `Ticket with ID '${ticketId}' not found`, 'TICKET_NOT_FOUND');
    this.name = 'TicketNotFoundError';
    this.ticketId = ticketId;
  }
}

export class TicketAlreadyInProgressError extends TicketError {
  public readonly ticketId: string;

  constructor(ticketId: string, message?: string) {
    super(message || `Ticket with ID '${ticketId}' is already in progress`, 'TICKET_ALREADY_IN_PROGRESS');
    this.name = 'TicketAlreadyInProgressError';
    this.ticketId = ticketId;
  }
}

export class TicketAlreadyCompletedError extends TicketError {
  public readonly ticketId: string;

  constructor(ticketId: string, message?: string) {
    super(message || `Ticket with ID '${ticketId}' is already completed`, 'TICKET_ALREADY_COMPLETED');
    this.name = 'TicketAlreadyCompletedError';
    this.ticketId = ticketId;
  }
}