---
id: '0004'
title: 'feat: ticket show command - チケット詳細表示機能'
status: todo
priority: high
created: '2025-07-07T05:21:39.369Z'
updated: '2025-07-07T05:21:39.369Z'
labels:
  - cli
  - ticket
  - show
---
# Ticket #0004: feat: ticket show command - チケット詳細表示機能

## Description

Implement `synapse ticket show <id>` command to display detailed information about a specific ticket. This command provides comprehensive ticket details including metadata, description, and content for work planning.

## Acceptance Criteria
- [ ] `synapse ticket show 001` displays ticket details
- [ ] Shows all ticket metadata (ID, title, status, priority, created, updated, assignee, labels)
- [ ] Displays full ticket description and content
- [ ] Handles non-existent ticket IDs gracefully
- [ ] Colorized output with clear formatting
- [ ] Unit tests for showTicket pure function
- [ ] Integration tests for CLI command

## Technical Requirements
- Extend LocalTicketService with getTicket method
- Create src/commands/ticket/show.ts pure function
- Add show subcommand to src/commands/ticket/index.ts
- Parse and display YAML frontmatter and markdown content
- Use chalk for colored terminal output
- Follow existing architecture patterns
