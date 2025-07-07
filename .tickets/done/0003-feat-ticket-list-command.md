---
id: '0003'
title: 'feat: ticket list command - チケット一覧表示機能'
status: done
priority: high
created: '2025-07-07T05:21:28.308Z'
updated: '2025-07-07T05:21:28.308Z'
labels:
  - cli
  - ticket
  - list
---
# Ticket #0003: feat: ticket list command - チケット一覧表示機能

## Description

Implement `synapse ticket list` command to display all tickets with filtering capabilities. This command enables users to view tickets in different statuses (todo/doing/done) and provides essential project overview functionality.

## Acceptance Criteria
- [ ] `synapse ticket list` shows all tickets
- [ ] `synapse ticket list --status todo` filters by status
- [ ] `synapse ticket list --priority high` filters by priority
- [ ] Displays ticket ID, title, status, priority in readable format
- [ ] Handles empty ticket directories gracefully
- [ ] Colorized output for better UX
- [ ] Unit tests for listTickets pure function
- [ ] Integration tests for CLI command

## Technical Requirements
- Extend LocalTicketService with listTickets method
- Create src/commands/ticket/list.ts pure function
- Add list subcommand to src/commands/ticket/index.ts
- Support filtering options (status, priority)
- Use chalk for colored terminal output
- Follow existing architecture patterns
