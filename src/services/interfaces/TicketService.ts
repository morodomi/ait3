import type { Ticket, CreateTicketOptions } from '../../common/types.js';

export interface TicketService {
  createTicket(title: string, options?: CreateTicketOptions): Promise<Ticket>;
  listTickets(options?: { status?: string; priority?: string }): Promise<Ticket[]>;
  // Future methods for CORE-3 and beyond:
  // getTicket(id: string): Promise<Ticket>;
  // updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  // deleteTicket(id: string): Promise<void>;
}