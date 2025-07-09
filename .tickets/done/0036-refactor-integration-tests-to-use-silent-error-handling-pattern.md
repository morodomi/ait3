---
id: '0036'
title: Refactor integration tests to use silent error handling pattern
status: done
priority: medium
created: '2025-07-09T11:40:52.961Z'
updated: '2025-07-09T12:17:27.642Z'
labels: []
started: '2025-07-09T11:42:44.266Z'
completed: '2025-07-09T12:17:27.642Z'
---
# Ticket #0036: Refactor integration tests to use silent error handling pattern

## Description

Integration tests currently output error messages during `npm publish` because they use `expect().toThrow()` pattern which allows error output to leak to console. This creates noise during test runs and looks unprofessional. Major npm packages like eslint, jest, and vitest avoid this by using try-catch patterns to capture errors silently.

## Acceptance Criteria
- [ ] Zero error messages printed during `npm run test:ci`
- [ ] All 512 tests still pass
- [ ] Clean output during `npm publish`  
- [ ] Create reusable test utilities for consistent error handling
- [ ] Update all 11 integration test files that use `.toThrow()` pattern

## Technical Requirements

### Current Pattern (Problematic)
```javascript
expect(() => {
  execSync('node dist/cli.js ticket show 9999', options);
}).toThrow();
```

### Target Pattern (Silent)
```javascript
try {
  execSync('node dist/cli.js ticket show 9999', { ...options, stdio: 'pipe' });
  expect.fail('Command should have failed');
} catch (error: any) {
  expect(error.code).not.toBe(0);
  expect(error.stderr || error.stdout).toContain("Ticket with ID '9999' not found");
}
```

### Files to Update
1. `tests/integration/cli/root.integration.test.ts`
2. `tests/integration/cli/ticket/start.integration.test.ts`
3. `tests/integration/cli/ticket/complete.integration.test.ts`
4. `tests/integration/cli/ticket/show.integration.test.ts`
5. `tests/integration/cli/ticket/list.integration.test.ts`
6. `tests/integration/cli/ticket/create.integration.test.ts`
7. `tests/integration/cli/flow/plan.integration.test.ts`
8. `tests/integration/cli/flow/green.integration.test.ts`
9. `tests/integration/cli/flow/red.integration.test.ts`
10. `tests/integration/cli/flow/refactor.integration.test.ts`
11. `tests/integration/cli/flow/squash.integration.test.ts`

### Test Utility Design
Create `tests/integration/helpers/cli-test-utils.ts`:
```typescript
export async function expectCliError(
  command: string,
  options: ExecSyncOptions,
  expectedError: string | RegExp
): Promise<void> {
  try {
    execSync(command, { ...options, stdio: 'pipe' });
    expect.fail(`Command should have failed: ${command}`);
  } catch (error: any) {
    expect(error.code).not.toBe(0);
    const output = error.stderr || error.stdout || '';
    if (typeof expectedError === 'string') {
      expect(output).toContain(expectedError);
    } else {
      expect(output).toMatch(expectedError);
    }
  }
}
```

## Dependencies
- No changes to actual CLI code
- Only test refactoring
- Maintains same test coverage

## Sub-tickets
- None needed - all changes in test files only

## Notes
- Always use `stdio: 'pipe'` to capture output
- Check both stderr and stdout as some errors appear in stdout
- Maintain existing timeout settings
- This follows npm ecosystem best practices
