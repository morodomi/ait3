---
id: '0005'
title: 'feat: ticket start command - チケット開始機能'
status: todo
priority: high
created: '2025-07-07T05:21:47.928Z'
updated: '2025-07-07T05:21:47.928Z'
labels:
  - cli
  - ticket
  - start
---
# Ticket #0005: feat: ticket start command - チケット開始機能

## Description

Implement `synapse ticket start <id>` command to change ticket status from 'todo' to 'doing' and move the file between directories. This command enables workflow management and ticket lifecycle tracking.

## Acceptance Criteria
- [ ] `synapse ticket start 001` moves ticket from todo to doing
- [ ] Updates ticket status in YAML frontmatter
- [ ] Updates ticket updated timestamp
- [ ] Moves file from .tickets/todo/ to .tickets/doing/
- [ ] Handles non-existent ticket IDs gracefully
- [ ] Prevents starting already started tickets
- [ ] Colorized success/error messages
- [ ] Unit tests for startTicket pure function
- [ ] Integration tests for CLI command

## Technical Requirements
- Extend LocalTicketService with updateTicketStatus method
- Create src/commands/ticket/start.ts pure function
- Add start subcommand to src/commands/ticket/index.ts
- File system operations (move, update content)
- Status validation and error handling
- Use chalk for colored terminal output
- Follow existing architecture patterns
