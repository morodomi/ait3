# Add --allow-dirty Option to ticket start Command - Implementation Plan

**Date**: 2025-08-07  
**Ticket**: #137  
**Author**: Claude Code  

## Executive Summary

Add an `--allow-dirty` option to the `ticket start` command to permit starting tickets with uncommitted changes in the working directory. This provides flexibility for exploratory development and multi-ticket workflows while maintaining safety through clear warnings.

## Current Behavior Analysis

### Current Flow (src/commands/ticket/start.ts)
1. Validate ticket ID format
2. Get ticket details from TicketService
3. **Git Operations** (lines 32-41):
   ```typescript
   // Check for uncommitted changes first (only when creating branches)
   const isRepo = await services.gitService.isRepository();
   if (isRepo) {
     const hasChanges = await services.gitService.hasUncommittedChanges();
     if (hasChanges) {
       throw new Error('Cannot start ticket: You have uncommitted changes. Please commit or stash them first.');
     }
   }
   ```
4. Create/checkout feature branch
5. Update ticket status to "doing"

### Key Observation
The uncommitted changes check is **only performed when creating/switching branches** (not with --no-branch). This check blocks the entire workflow to ensure clean branch separation.

## Proposed Implementation

### 1. Type Definition Update
```typescript
// src/common/types.ts
export interface StartTicketArgs {
  id: string;
  noBranch?: boolean;
  allowDirty?: boolean;  // New optional flag
}
```

### 2. CLI Command Update
```typescript
// src/commands/ticket/index.ts
ticketCommand
  .command('start <id>')
  .description('Start working on a ticket')
  .option('--no-branch', 'Skip Git branch creation/switching')
  .option('--allow-dirty', 'Allow starting with uncommitted changes')
  .action(async (id: string, options) => {
    const services = await ServiceFactory.createServices();
    const result = await startTicket({ 
      id, 
      noBranch: options.branch === false,
      allowDirty: options.dirty !== false  // Commander.js pattern: --allow-dirty creates {dirty: false}
    }, services);
    // ... rest
  });
```

### 3. Core Logic Update with Safety Warnings
```typescript
// src/commands/ticket/start.ts
export async function startTicket(
  args: StartTicketArgs,
  services: Services
): Promise<CLIResult> {
  // ... validation ...

  if (!args.noBranch && services.gitService && ticket) {
    try {
      const isRepo = await services.gitService.isRepository();
      if (isRepo) {
        const hasChanges = await services.gitService.hasUncommittedChanges();
        
        if (hasChanges && !args.allowDirty) {
          // Current behavior - block with error
          throw new Error('Cannot start ticket: You have uncommitted changes. Please commit or stash them first.');
        } else if (hasChanges && args.allowDirty) {
          // New behavior - show warning but continue
          const status = await services.gitService.getStatus();
          gitMessage = formatDirtyWarning(status);
        }
      }
      
      // Continue with branch creation...
      gitMessage += await handleGitOperations(args.id, ticket.title, services.gitService);
    } catch (gitError) {
      // ... error handling
    }
  }
}

function formatDirtyWarning(status: GitStatus): string {
  const parts = [
    STYLES.warning('WARNING: Creating branch with uncommitted changes:')
  ];
  
  if (status.modified.length > 0) {
    parts.push(STYLES.muted(`   Modified: ${status.modified.length} file(s)`));
  }
  if (status.added.length > 0) {
    parts.push(STYLES.muted(`   Added: ${status.added.length} file(s)`));
  }
  if (status.deleted.length > 0) {
    parts.push(STYLES.muted(`   Deleted: ${status.deleted.length} file(s)`));
  }
  if (status.untracked.length > 0) {
    parts.push(STYLES.muted(`   Untracked: ${status.untracked.length} file(s)`));
  }
  
  parts.push(STYLES.info('These changes will be carried to the new branch.'));
  parts.push('');
  
  return parts.join('\n');
}
```

### 4. GitService Interface Extension
```typescript
// src/services/interfaces/GitService.ts
export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitService {
  // ... existing methods ...
  getStatus(): Promise<GitStatus>;  // New method for detailed status
}
```

### 5. SimpleGitService Implementation
```typescript
// src/services/implementations/SimpleGitService.ts
async getStatus(): Promise<GitStatus> {
  const status = await this.git.status();
  return {
    modified: status.modified,
    added: status.created,
    deleted: status.deleted,
    untracked: status.not_added,
    ahead: status.ahead,
    behind: status.behind
  };
}
```

## Test Coverage

### Unit Tests (start.test.ts)
1. **Basic --allow-dirty functionality**
   - Allows branch creation with uncommitted changes
   - Shows warning message with change summary
   - Changes are preserved on new branch

2. **Flag combinations**
   - --allow-dirty alone: creates branch with changes
   - --allow-dirty + --no-branch: skips branch, no warning needed
   - Neither flag with dirty state: throws error (current behavior)

3. **Warning message tests**
   - Correct file counts for each change type
   - Proper formatting and styling
   - Clear indication changes will be carried over

### Integration Tests (start-allow-dirty.integration.test.ts)
1. **Real Git scenarios**
   - Modified files carried to new branch
   - Untracked files preserved
   - Staged changes preserved
   - Mixed state handling

2. **Error cases**
   - Without --allow-dirty flag (should fail)
   - Non-Git repository behavior
   - Git command failures

## Implementation Steps

### Phase 1: Core Implementation
1. ✅ Add `allowDirty?: boolean` to StartTicketArgs
2. ✅ Add `--allow-dirty` CLI option
3. ✅ Implement conditional uncommitted changes check
4. ✅ Add warning message formatting

### Phase 2: GitService Enhancement
1. ✅ Add GitStatus interface
2. ✅ Add getStatus() method to GitService interface
3. ✅ Implement getStatus() in SimpleGitService
4. ✅ Add mock implementation for tests

### Phase 3: Testing
1. ✅ Add unit tests for --allow-dirty behavior
2. ✅ Add integration tests for real Git scenarios
3. ✅ Test warning message formatting
4. ✅ Test flag combinations

### Phase 4: Documentation
1. ✅ Update help text with new option
2. ✅ Add examples to documentation
3. ✅ Update CHANGELOG.md

## Risk Analysis

### Low Risk
- Implementation is additive (new optional parameter)
- Existing behavior unchanged when flag not used
- Clear warning messages inform users of state
- No data loss - changes are preserved

### Mitigation Strategies
- Clear warning showing exact uncommitted changes
- Explicit opt-in via --allow-dirty flag
- Comprehensive test coverage
- Documentation emphasizes safety considerations

## Performance Optimizations (From Review)

### Git Status Call Optimization
Consider combining `hasUncommittedChanges()` and `getStatus()` into a single call:
```typescript
// Optimized approach - single git status call
const statusResult = await services.gitService.getStatusSummary();
if (statusResult.hasChanges && !args.allowDirty) {
  throw new Error('Cannot start ticket: You have uncommitted changes...');
} else if (statusResult.hasChanges && args.allowDirty) {
  gitMessage = formatDirtyWarning(statusResult.summary);
}
```

### Memory Efficiency
Use counts instead of full file arrays for large repositories:
```typescript
export interface GitStatusSummary {
  modified: number;    // Just counts for display
  added: number;
  deleted: number;
  untracked: number;
}
```

## Acceptance Criteria

✅ From ticket #137:
- [ ] `--allow-dirty` flag bypasses clean check
- [ ] Warning message shows uncommitted changes summary
- [ ] Changes are preserved on new branch
- [ ] Default behavior unchanged (backward compatible)
- [ ] Tests cover various dirty states
- [ ] Documentation includes safety considerations
- [ ] Help text includes new option

## Decision Points

1. **Warning Detail Level**
   - ✅ Show summary counts (not full file list) to avoid clutter
   - ✅ Group by change type (modified/added/deleted/untracked)

2. **Flag Naming**
   - ✅ Use `--allow-dirty` (clear and consistent)
   - ✅ Commander.js creates `{ dirty: false }` pattern

3. **Interaction with --no-branch**
   - ✅ --no-branch skips check entirely (current behavior)
   - ✅ --allow-dirty only relevant when creating branches

## Example Usage

```bash
# Current behavior (fails with uncommitted changes)
$ ait3 ticket start 123
ERROR: Cannot start ticket: You have uncommitted changes. Please commit or stash them first.

# New behavior with --allow-dirty
$ ait3 ticket start 123 --allow-dirty
SUCCESS: Started ticket #123: Feature implementation

WARNING: Creating branch with uncommitted changes:
   Modified: 3 file(s)
   Untracked: 2 file(s)
These changes will be carried to the new branch.

SUCCESS: Created and switched to branch: feature/123-feature-implementation

Next Action:
└─ Run: ait3 flow plan 123
```

## Conclusion

The --allow-dirty option provides needed flexibility for exploratory development workflows while maintaining safety through explicit opt-in and clear warnings. The implementation leverages existing patterns from the --no-branch work and maintains backward compatibility.