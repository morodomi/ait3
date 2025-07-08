---
id: '0021'
title: ticket undoコマンド実装 - チケット操作の取り消し機能
status: todo
priority: medium
created: '2025-07-08T02:34:02.542Z'
updated: '2025-07-08T02:34:02.542Z'
labels:
  - feature
  - workflow
  - safety
---
# Ticket #0021: ticket undoコマンド実装 - チケット操作の取り消し機能

## Description

Implement a `ticket undo` command that allows users to revert the last ticket operation. This feature provides a safety net for accidental ticket state changes, enabling users to quickly recover from mistakes without manual file manipulation.

The undo command should track and revert operations such as:
- `ticket start` - Reverts ticket from 'doing' back to 'todo'
- `ticket complete` - Reverts ticket from 'done' back to 'doing' (or 'todo' if it was directly completed)
- `ticket reopen` - Reverts ticket from 'todo' back to 'done'
- `ticket delete` - Restores deleted ticket to its previous state

## Acceptance Criteria

### Basic Functionality
- [ ] `ait3 ticket undo` reverts the most recent ticket operation
- [ ] Command shows clear feedback about what operation was undone
- [ ] Undo operation updates both file location and ticket metadata

### Supported Operations
- [ ] Undo `start` operation: Move ticket from doing/ back to todo/
- [ ] Undo `complete` operation: Move ticket from done/ back to doing/ (or todo/)
- [ ] Undo `reopen` operation: Move ticket from todo/ back to done/
- [ ] Undo `delete` operation: Restore ticket file with original content

### Edge Cases
- [ ] Graceful handling when no operations to undo
- [ ] Clear error message when undo history is empty
- [ ] Prevent undo if ticket has been modified after the operation
- [ ] Handle missing or corrupted undo history file

### History Management
- [ ] Store last operation details in `.tickets/.undo-history.json`
- [ ] Include operation type, ticket ID, timestamp, and previous state
- [ ] Limit history to last operation only (single-level undo)
- [ ] Clear history entry after successful undo

## Technical Requirements

### Implementation Approach
1. **Operation Tracking**: Store last operation in `.tickets/.undo-history.json`
2. **State Preservation**: Save complete ticket state before each operation
3. **Atomic Operations**: Ensure undo is atomic (all-or-nothing)
4. **Validation**: Check ticket hasn't been modified since operation

### Undo History Format
```json
{
  "lastOperation": {
    "type": "start|complete|reopen|delete",
    "ticketId": "0021",
    "timestamp": "2025-07-08T02:34:02.542Z",
    "previousState": {
      "status": "todo",
      "content": "...",
      "metadata": { ... }
    },
    "newState": {
      "status": "doing",
      "content": "...",
      "metadata": { ... }
    }
  }
}
```

### Command Structure
```typescript
export function undoTicket(
  args: UndoCommandArgs,
  services: ServiceContainer
): Promise<CLIResult> {
  // 1. Read undo history
  // 2. Validate operation can be undone
  // 3. Restore previous state
  // 4. Clear history entry
  // 5. Return success result
}
```

## Safety and Data Integrity

### Data Protection
- Never overwrite existing files without backup
- Validate ticket content hasn't changed since operation
- Use atomic file operations to prevent partial updates
- Create temporary backup during undo process

### User Feedback
- Confirm operation before executing (unless --force flag)
- Show clear summary of what will be undone
- Display ticket details that will be restored
- Warn if undo might cause data loss

### Error Recovery
- If undo fails, preserve current state
- Log detailed error information for debugging
- Provide manual recovery instructions
- Keep undo history intact on failure

## Implementation Notes

### Phase 1: Core Functionality
- Implement basic undo for start/complete operations
- Create undo history tracking system
- Add comprehensive error handling

### Phase 2: Extended Support
- Add support for reopen and delete operations
- Implement conflict detection
- Add --dry-run option for preview

### Phase 3: Enhanced Features
- Consider multi-level undo support (future enhancement)
- Add undo statistics and analytics
- Integrate with flow commands

## Related
- Consider how undo interacts with concurrent ticket operations
- Ensure compatibility with future ticket features
- Document undo behavior in user guide
