---
id: '0007'
title: 'refactor: Rebrand project from Synapse to AIT3 - プロジェクト名とコマンドの変更'
status: done
priority: high
created: '2025-07-07T08:19:29.689Z'
updated: '2025-07-07T08:42:10.209Z'
labels:
  - refactor
  - branding
  - breaking-change
started: '2025-07-07T08:21:56.258Z'
completed: '2025-07-07T08:42:10.209Z'
---
# Ticket #0007: refactor: Rebrand project from Synapse to AIT3 - プロジェクト名とコマンドの変更

## Description

Complete rebranding of the project from "Synapse" to "AIT³" (AI + Ticket + Test + Tool driven development). This includes changing all references to the project name, CLI command, and related identifiers throughout the codebase.

**Rationale**: 
- AIT³ better represents the methodology (AI, Ticket, Test, Tool)
- Avoids confusion with existing TiDD (Ticket-Driven Development)
- `ait3` command has no npm conflicts

## Acceptance Criteria
- [ ] Change package name from `synapse` to `@morodomi/ait3`
- [ ] Rename main command from `synapse` to `ait3`
- [ ] Update bin script from `synapse.js` to `ait3.js`
- [ ] Rename `src/commands/tdd/` to `src/commands/flow/`
- [ ] Update all CLI subcommands to use `flow` instead of `tdd`
- [ ] Update package.json with new project details
- [ ] Update CLAUDE.md to reflect new branding
- [ ] Update all test files to use new command names
- [ ] Update all documentation and comments
- [ ] Ensure all tests pass with new naming

## Technical Requirements
### File Changes
1. **Rename files**:
   - `bin/synapse.js` → `bin/ait3.js`
   - `src/commands/tdd/` → `src/commands/flow/`

2. **Update package.json**:
   - name: `@morodomi/ait3`
   - bin: `{ "ait3": "./bin/ait3.js" }`
   - description: Update to reflect AIT³ methodology

3. **Update CLI routing** (src/cli.ts):
   - Change program name from 'synapse' to 'ait3'
   - Update help text and descriptions

4. **Update commands**:
   - `ait3 flow plan` (was: synapse tdd plan)
   - `ait3 flow red` (was: synapse tdd red)
   - `ait3 flow green` (was: synapse tdd green)
   - `ait3 flow refactor` (was: synapse tdd refactor)
   - `ait3 flow squash` (was: synapse tdd squash)

5. **Update tests**:
   - Change all references to 'synapse' command to 'ait3'
   - Update test descriptions

6. **Documentation**:
   - Update CLAUDE.md
   - Create/update README.md
   - Update inline documentation

## Dependencies
- None

## Notes
- This is a breaking change for any existing users (currently none as project is local only)
- No alias setup needed as Claude Code will use the commands directly
- Consider `.tickets/` vs `.ait3/` directory (keep as .tickets for now)
