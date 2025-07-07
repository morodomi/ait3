---
id: '0006'
title: 'feat: ticket complete command - チケット完了機能'
status: done
priority: high
created: '2025-07-07T05:21:54.109Z'
updated: '2025-07-07T07:08:04.282Z'
labels:
  - cli
  - ticket
  - complete
completed: '2025-07-07T07:08:04.282Z'
---
# Ticket #0006: feat: ticket complete command - チケット完了機能

## Description

Implement `synapse ticket complete <id>` command to change ticket status from 'doing' to 'done' and move the file between directories. This command completes the ticket lifecycle and enables workflow completion tracking.

## Acceptance Criteria
- [ ] `synapse ticket complete 001` moves ticket from doing to done
- [ ] Updates ticket status in YAML frontmatter
- [ ] Updates ticket updated timestamp
- [ ] Moves file from .tickets/doing/ to .tickets/done/
- [ ] Handles non-existent ticket IDs gracefully
- [ ] Prevents completing non-active tickets
- [ ] Colorized success/error messages
- [ ] Unit tests for completeTicket pure function
- [ ] Integration tests for CLI command

## Technical Requirements
- Extend LocalTicketService with updateTicketStatus method (shared with start)
- Create src/commands/ticket/complete.ts pure function
- Add complete subcommand to src/commands/ticket/index.ts
- File system operations (move, update content)
- Status validation and error handling
- Use chalk for colored terminal output
- Follow existing architecture patterns
