---
id: '0044'
title: Fix GitHub Issues migration and integration bugs
status: doing
priority: medium
created: '2025-07-09T23:05:11.461Z'
updated: '2025-07-09T23:06:02.636Z'
labels: ['bug', 'github-integration']
started: '2025-07-09T23:06:02.636Z'
---
# Ticket #0044: Fix GitHub Issues migration and integration bugs

## Description

Fix multiple bugs in GitHub Issues integration:

1. **Migration Bug**: Done tickets are not closed when migrated to GitHub (all tickets created as OPEN)
2. **Content Loss**: Ticket description/content is not migrated, only frontmatter metadata
3. **Create Command**: `ait3 ticket create` creates local files even when backend is "github"
4. **Auth Requirement**: GITHUB_TOKEN must be manually exported, should use gh auth token automatically

## Root Causes

1. **TicketMigrationService**: Always creates issues with default state (open)
2. **Migration Logic**: Only passes title and metadata, not markdown content
3. **GitHubTicketService**: Not being used by create command when configured
4. **Token Handling**: Not automatically using gh CLI authentication

## Acceptance Criteria

- [ ] Done tickets are created as CLOSED issues on GitHub
- [ ] Full ticket content (markdown body) is migrated
- [ ] `ticket create` uses GitHubTicketService when backend="github"
- [ ] Automatically use `gh auth token` when GITHUB_TOKEN not set
- [ ] All existing tests pass
- [ ] New tests for fixed behaviors

## Implementation Plan (PLANNING Phase Complete)

### 1. **Auth Fix (最優先)**
```typescript
// GitHubTicketService.ts constructor
if (!authToken && config.useGhCli !== false) {
  try {
    const { execSync } = require('child_process');
    authToken = execSync('gh auth token', { encoding: 'utf-8' }).trim();
  } catch {
    // gh CLI not available or not authenticated
  }
}
```

### 2. **Service Creation Timing Fix**
```typescript
// src/commands/ticket/index.ts
// Remove: const services = ServiceFactory.createServices();
// Add in each action:
.action(async (title: string, options) => {
  const services = ServiceFactory.createServices(); // Create services per command
  // ...
})
```

### 3. **Migration Status Fix**
```typescript
// TicketMigrationService.ts after createTicket
if (ticket.status === 'done') {
  await githubService.completeTicket(createdTicket.id);
} else if (ticket.status === 'doing') {
  await githubService.startTicket(createdTicket.id);
}
```

### 4. **Content Migration Fix**
```typescript
// LocalTicketService - simplify description extraction
const description = markdownContent.trim(); // Get full content
```

## Gemini Analysis Summary
- Auth token fix is straightforward with gh CLI fallback
- Service creation timing is the root cause of backend switching issue
- Migration fixes are simple post-processing steps
- Content extraction needs simplified regex
