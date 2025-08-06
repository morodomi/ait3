# Project Root Detection Implementation Plan

**Date**: 2025-08-05  
**Ticket**: #135 - Implement project root detection to prevent nested .tickets directories  
**Author**: Claude Code

## Problem Statement

When running `ait3` commands from a subdirectory, the tool creates a new `.tickets` directory in the current location instead of using the project's root `.tickets` directory. This leads to:
- Multiple `.tickets` directories in a single project
- Confusion about which tickets are active
- Fragmented ticket management

## Current Implementation Analysis

### How Tickets Path is Currently Determined

1. **ServiceFactory.loadConfig()**:
   ```typescript
   const ticketsPath = process.env.TICKETS_DIR || '.tickets';
   const configPath = join(process.cwd(), ticketsPath, 'config.json');
   ```

2. **ServiceFactory.createTicketService()**:
   ```typescript
   const ticketsPath = process.env.TICKETS_DIR || config.local?.path || '.tickets';
   return new LocalTicketService(ticketsPath, gitService);
   ```

**Problem**: Always uses `process.cwd()` which is the current working directory, not the project root.

## Proposed Solution

### 1. Create Project Root Detection Utility

Create `src/common/utils/projectRootUtils.ts`:

```typescript
import { access, constants } from 'fs/promises';
import { join, dirname, parse } from 'path';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findProjectRoot(startPath: string = process.cwd()): Promise<string> {
  let currentPath = startPath;
  const root = parse(currentPath).root;

  while (currentPath !== root) {
    // Priority 1: Existing .tickets directory
    if (await exists(join(currentPath, '.tickets'))) {
      return currentPath;
    }
    
    // Priority 2: Git repository root
    if (await exists(join(currentPath, '.git'))) {
      return currentPath;
    }
    
    // Move up one directory
    currentPath = dirname(currentPath);
  }
  
  // Fallback: use starting directory
  return startPath;
}
```

### 2. Add Caching for Performance

```typescript
export class ProjectRootCache {
  private static cache: Map<string, string> = new Map();
  
  static async get(startPath: string = process.cwd()): Promise<string> {
    const key = startPath;
    if (!this.cache.has(key)) {
      const root = await findProjectRoot(startPath);
      this.cache.set(key, root);
    }
    return this.cache.get(key)!;
  }
  
  static clear(): void {
    this.cache.clear();
  }
}
```

### 3. Integrate into ServiceFactory

Update `ServiceFactory.loadConfig()`:

```typescript
private static async loadConfig(): Promise<BackendConfig> {
  try {
    const projectRoot = await ProjectRootCache.get();
    const ticketsPath = process.env.TICKETS_DIR || '.tickets';
    const configPath = join(projectRoot, ticketsPath, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    return {
      backend: config.backend || 'local',
      local: config.local || { path: join(projectRoot, ticketsPath) },
      github: config.github
    };
  } catch {
    const projectRoot = await ProjectRootCache.get();
    return {
      backend: 'local',
      local: { path: join(projectRoot, process.env.TICKETS_DIR || '.tickets') }
    };
  }
}
```

## Search Priority Algorithm

1. **Look for .tickets in current directory and parents**
   - Most specific indicator of project root
   - Respects existing project structure

2. **If not found, look for .git and create .tickets there**
   - Common project root indicator
   - Works for new projects

3. **If neither found, create .tickets in current directory**
   - Maintains backward compatibility
   - Works in non-git environments

## Test Scenarios

### Unit Tests for `findProjectRoot`

```typescript
describe('findProjectRoot', () => {
  it('should find .tickets in current directory');
  it('should find .tickets in parent directory');
  it('should find .git when no .tickets exists');
  it('should prefer .tickets over .git');
  it('should handle nested git repositories');
  it('should fallback to current directory');
  it('should handle filesystem root correctly');
});
```

### Integration Tests

```typescript
describe('ait3 commands from subdirectory', () => {
  it('should use root .tickets when running from subdirectory');
  it('should not create nested .tickets directories');
  it('should respect TICKETS_DIR environment variable');
});
```

### Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle symlinks correctly');
  it('should handle permission errors gracefully');
  it('should work across different operating systems');
  it('should handle very deep directory structures');
});
```

## Implementation Phases

### Phase 1: Basic Functionality (Priority: High)
- Implement `findProjectRoot` function
- Update ServiceFactory to use project root
- Create comprehensive unit tests
- Ensure backward compatibility

### Phase 2: Performance Optimization (Priority: Medium)
- Implement caching mechanism
- Add performance benchmarks
- Optimize for repeated command execution

### Phase 3: Edge Case Handling (Priority: Low)
- Handle symbolic links properly
- Add permission error handling
- Support unconventional project structures

## Impact Analysis

### Affected Components
- **ServiceFactory**: Main integration point
- **LocalTicketService**: No direct changes needed
- **All commands**: Will automatically benefit from the fix

### Breaking Changes
- None expected - maintains backward compatibility
- TICKETS_DIR environment variable continues to work

### Performance Considerations
- Initial directory traversal adds minimal overhead
- Caching ensures subsequent calls are instant
- No impact on ticket operations themselves

## Alternative Approaches Considered

### 1. Configuration File in Home Directory
- **Pros**: Explicit project mapping
- **Cons**: Requires manual setup, not portable

### 2. Command-line Flag for Project Root
- **Pros**: Explicit control
- **Cons**: Poor user experience, easy to forget

### 3. Package.json Detection
- **Pros**: Common in JavaScript projects
- **Cons**: Not universal, excludes non-JS projects

## Conclusion

The proposed upward directory traversal approach provides:
- Zero-configuration experience
- Compatibility with existing projects
- Minimal performance impact
- Natural behavior similar to git

This solution follows established patterns used by tools like git, npm, and other CLI tools that need to find project roots.