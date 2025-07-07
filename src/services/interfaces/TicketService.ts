import type { Ticket, CreateTicketOptions } from '../../common/types.js';

export interface TicketService {
  createTicket(title: string, options?: CreateTicketOptions): Promise<Ticket>;
  listTickets(options?: { status?: string; priority?: string }): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | null>;
  startTicket(id: string): Promise<void>;
  // Future methods for CORE-6 and beyond:
  // updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  // deleteTicket(id: string): Promise<void>;
}