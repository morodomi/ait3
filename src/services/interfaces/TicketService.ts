import type { Ticket, CreateTicketOptions } from '../../common/types.js';

export interface TicketService {
  createTicket(title: string, options?: CreateTicketOptions): Promise<Ticket>;
  // Future methods for CORE-2 and beyond:
  // getTicket(id: string): Promise<Ticket>;
  // updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>;
  // deleteTicket(id: string): Promise<void>;
  // listTickets(filters?: TicketFilters): Promise<Ticket[]>;
}