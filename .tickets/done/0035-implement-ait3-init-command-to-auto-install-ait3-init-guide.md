---
id: '0035'
title: Implement ait3 init command to auto-install ait3-init guide
status: done
priority: medium
created: '2025-07-09T11:00:26.769Z'
updated: '2025-07-09T11:12:58.721Z'
labels: []
started: '2025-07-09T11:01:03.732Z'
completed: '2025-07-09T11:12:58.721Z'
---
# Ticket #0035: Implement ait3 init command to auto-install ait3-init guide

## Description

Modify the `ait3 init` command to automatically install the `.claude/commands/ait3-init` guide and provide instructions for using it with Claude Code to generate CLAUDE.md.

## Acceptance Criteria

- [ ] `ait3 init` (without subcommands) installs `.claude/commands/ait3-init`
- [ ] Reuse existing `installCommandCommand` logic from `install/command.ts`
- [ ] After successful installation, display English instructions for using Claude Code
- [ ] Instructions should guide users to:
  - Launch Claude Code in their terminal
  - Run `/ait3-init` command
  - Follow the guide to generate CLAUDE.md
- [ ] Handle cases where the command guide already exists
- [ ] Maintain backward compatibility with `ait3 init claude-md`

## Technical Requirements

- Import and use `installCommandCommand` from `../install/command.js`
- Pass `{ name: 'ait3-init', force: args.force }` to the install function
- Display clear, actionable instructions in English
- Return appropriate success/failure status

## Example Output

```
SUCCESS: Installed command guide: .claude/commands/ait3-init

Next steps to generate CLAUDE.md:
1. Launch Claude Code in your terminal: claude
2. In Claude Code, run: /ait3-init
3. Follow the interactive guide to analyze your project and generate CLAUDE.md

The ait3-init guide will help you:
- Analyze your project structure and dependencies
- Detect build, test, and lint commands
- Understand your business logic
- Create a comprehensive CLAUDE.md file
```
