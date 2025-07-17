# AIT³ Development Plan: Core Rails Enhancement & Future Extensions

**Date**: 2025-07-17  
**Author**: AIT³ Development Team  
**Status**: Planning Phase (Revised)  
**Version**: 2.0

## 📋 Current Challenges

### 1. **AI Behavior Control Challenge**
- **Goal**: Guide AI to produce clean, focused code following project patterns
- **Core Problem**: AI tends to over-engineer solutions
- **Specific Manifestations**:
  - Creates test-specific classes (e.g., `TestUserService`) instead of using real implementations
  - Adds excessive abstraction layers (interfaces for single implementations)
  - Creates multiple new files for simple changes
  - Violates SOLID/KISS/DRY/YAGNI principles despite knowing them
- **Root Cause**: AI memory limitations (~5 conversation turns) mean static rules are quickly forgotten

### 2. **Workflow Adherence Gap**
- **Goal**: Ensure strict AIT³ workflow (PLAN→RED→GREEN→REFACTOR→SQUASH)
- **Problem**: Without constant reminders, AI and developers drift from the process
- **Specific Issues**:
  - Jumping straight to implementation without tests
  - Scope expansion during implementation
  - Forgetting ticket boundaries
  - Missing the dialectical process (Claude→Gemini→Human)

### 3. **Principle Application Inconsistency**
- **Goal**: Consistent application of engineering principles
- **Problem**: Principles are known but not contextually applied
- **Specific Issues**:
  - SOLID: Over-applying SRP leading to file proliferation
  - KISS: Adding complexity "for future flexibility"
  - DRY: Creating abstractions for single-use cases
  - YAGNI: Implementing features "while we're here"

### 4. **Future Enhancement Needs** (Lower Priority)
- **Ticket-Issue Synchronization**: Local `.tickets/` ↔ GitHub Issues
- **Ticket Hierarchy**: Parent-child relationships for complex projects
- **Multi-user Support**: Team collaboration features

## 🎯 Proposed Solutions

### Solution 1: "Straight Rails" System (Priority: HIGH)

**Concept**: Build clear, contextual guidance rails that keep AI on track through dynamic reminders rather than static rules

#### Core Insight
- **Problem**: AI forgets static rules after ~5 conversation turns
- **Solution**: Embed principles and reminders contextually in command outputs

#### Implementation Strategy

##### 1. **Enhanced Flow Commands with Embedded Principles**
```bash
ait3 flow red 001
```
Output includes:
```
🔴 RED Phase: Test Creation
━━━━━━━━━━━━━━━━━━━━━━
📋 Ticket: #001 User Authentication
📍 Scope: src/auth/User.ts ONLY

🎯 Principle Reminders:
• KISS: Start with minimal test cases
• YAGNI: Don't anticipate future requirements
• DRY: Reuse existing test patterns
• Scope: This ticket affects ONLY listed files

💡 Reference: tests/unit/services/LocalTicketService.test.ts
⚠️ Warning: Do NOT create TestUser or MockUser classes
```

##### 2. **Dynamic Context Injection**
```typescript
// Contextual warnings based on current state
function getPhaseReminders(phase: string, context: TicketContext): string[] {
  const reminders = [];
  
  if (context.newFilesCount > 2) {
    reminders.push('⚠️ Detected ${context.newFilesCount} new files. Consider modifying existing files instead (KISS)');
  }
  
  if (context.interfaceCount > context.implementationCount) {
    reminders.push('🚨 More interfaces than implementations detected. Apply YAGNI principle');
  }
  
  if (phase === 'GREEN' && context.testsPassing < 1) {
    reminders.push('❌ No tests passing yet. Focus on making ONE test pass first');
  }
  
  return reminders;
}
```

##### 3. **Progressive Disclosure of Information**
```bash
# Instead of dumping all information at once
ait3 flow green 001 --step 1  # Focus on first failing test
ait3 flow green 001 --step 2  # Move to next test only after success
```

##### 4. **Soft Validation Hooks (Warnings, not Blocks)**
```bash
# .claude/hooks/post-edit-warning.sh
#!/bin/bash
if [[ $(git status --porcelain | grep "^??" | wc -l) -gt 2 ]]; then
  echo "💡 Reminder: ${NEW_FILES} new files detected"
  echo "   Consider if existing files can be modified instead"
  echo "   Principle: KISS - Keep It Simple"
fi
```

### Solution 2: Local-GitHub Sync System (Priority: MEDIUM)

**Concept**: Maintain synchronization between local tickets and GitHub Issues

#### Revised Architecture
```yaml
# .tickets/todo/0001-user-auth.md
---
github:
  issue_number: 82
  last_sync: 2025-07-17T10:00:00Z
ait3:
  phase: RED
  scope: ["src/auth/User.ts", "tests/unit/auth/User.test.ts"]
---
```

#### GitHub Issue Enhancement
```markdown
## AIT³ Workflow Status
- [ ] PLANNING
- [x] RED (In Progress)
- [ ] GREEN
- [ ] REFACTOR
- [ ] SQUASH

**Scope**: `src/auth/User.ts`
**Last Updated**: 2025-07-17 10:00 (automated)
```

#### Key Implementation Points
- **Hooks-based sync**: `.tickets/` file changes trigger GitHub API calls
- **Conflict resolution**: Local always wins, GitHub is display layer
- **Single-user optimization**: No locking needed for v1

### Solution 3: Ticket Hierarchy System (Priority: LOW)

**Concept**: Support complex project breakdown with parent-child relationships

#### Data Structure
```yaml
# Enhanced ticket metadata
---
ticket:
  id: "0001"
  type: "epic"  # epic|story|task
  parent: null
  children: ["0002", "0003", "0004"]
  blocking: false  # children can progress independently
---
```

#### PLAN Phase Enhancement
```bash
ait3 flow plan 001 --decompose
```
Creates:
- Automatic child ticket generation from requirements
- Maintains relationship tracking
- Independent progress per ticket

### Solution 4: Principle Enforcement Patterns

**Concept**: Make principles impossible to ignore through repetition and context

#### Implementation Ideas

##### 1. **Principle-Specific Warnings**
```typescript
// SOLID Violations
if (classCount > 5 && fileCount === 1) {
  warn("📚 SRP: Consider splitting into multiple files");
}

// KISS Violations  
if (abstractionLayers > 2) {
  warn("🎯 KISS: ${abstractionLayers} layers detected. Is this necessary?");
}

// DRY Violations
if (duplicatePatterns > 3) {
  warn("♻️ DRY: Similar code found in ${duplicatePatterns} places");
}

// YAGNI Violations
if (unusedExports > 0) {
  warn("🚫 YAGNI: ${unusedExports} unused exports detected");
}
```

##### 2. **Workflow Checkpoints**
```bash
ait3 flow checkpoint 001
```
Output:
```
✅ RED Phase Complete
  - Tests created: 5
  - Files modified: 2
  - New files: 0 (Good!)

⚠️ Ready for GREEN Phase?
  - All tests failing: ✅
  - Scope documented: ✅
  - Principles review:
    [ ] KISS: Minimal implementation planned?
    [ ] YAGNI: Only implementing tested features?
    [ ] DRY: Reusing existing patterns?
```

## 📊 Revised Priority Matrix

| Priority | Solution | Impact | Effort | Rationale |
|----------|----------|---------|---------|-----------|
| **HIGH** | Straight Rails System | Very High | Low-Medium | Addresses core AI behavior issues immediately |
| **HIGH** | Principle Enforcement | Very High | Low | Improves code quality with minimal implementation |
| **MEDIUM** | Local-GitHub Sync | High | Medium | Valuable but not blocking core functionality |
| **LOW** | Ticket Hierarchy | Medium | High | Complex feature that can wait |
| **LOW** | Multi-user Support | Low | Very High | Not needed for single developer use |

## 🚀 Revised Implementation Plan

### Phase 1: Core Rails (v1.3.0) - 2 Weeks
**Goal**: Make AI behavior predictable and principles unavoidable

#### Week 1: Command Enhancement
- [ ] Enhance all flow commands with contextual principle reminders
- [ ] Add dynamic warnings based on file/code analysis
- [ ] Implement `--step` mode for progressive implementation
- [ ] Create `flow checkpoint` command for phase transitions

#### Week 2: Soft Validation
- [ ] Implement warning-only hooks (no blocking)
- [ ] Add principle violation detection
- [ ] Create context-aware reminder system
- [ ] Test with real development scenarios

### Phase 2: Sync Foundation (v1.4.0) - 3 Weeks
**Goal**: Seamless local-GitHub integration

#### Week 3: Basic Sync
- [ ] File watcher for `.tickets/` directory
- [ ] GitHub Issue update on local changes
- [ ] Workflow phase checklist in Issues

#### Week 4: Bidirectional Sync
- [ ] Pull GitHub Issue changes to local
- [ ] Conflict resolution (local wins)
- [ ] Sync status indicators

#### Week 5: Polish
- [ ] Error handling and retry logic
- [ ] Performance optimization
- [ ] Documentation and examples

### Phase 3: Advanced Features (v1.5.0) - Future
- [ ] Ticket hierarchy system
- [ ] Multi-user collaboration
- [ ] Web dashboard

## 📈 Success Metrics

### For Rails System (Phase 1)
1. **AI Compliance Rate**: >90% of generated code follows project patterns
2. **File Proliferation**: <2 new files per ticket on average
3. **Principle Violations**: <1 per flow phase
4. **Developer Satisfaction**: Reduced manual correction time

### For Sync System (Phase 2)
1. **Sync Reliability**: 99.9% successful syncs
2. **Latency**: <2 seconds for local→GitHub update
3. **Data Integrity**: Zero data loss incidents
4. **Workflow Visibility**: 100% of tickets show phase in GitHub

## 🔄 Immediate Next Steps

### This Week (Rails System)
1. **Day 1-2**: Implement enhanced `flow red` command with principles
2. **Day 3-4**: Add dynamic context detection system
3. **Day 5**: Create proof-of-concept warning hooks

### Next Week
1. **Day 1-2**: Extend to all flow commands
2. **Day 3-4**: Implement checkpoint system
3. **Day 5**: Real-world testing and refinement

## 💡 Key Design Decisions

### Why "Rails" First?
1. **Immediate Impact**: Solves the most painful daily problems
2. **Low Risk**: Enhances existing commands without breaking changes
3. **Foundation**: Better AI behavior makes future features more valuable
4. **User Feedback**: Can iterate quickly based on usage

### Why Delay Sync?
1. **Complexity**: Requires robust error handling
2. **Dependencies**: Needs GitHub API setup and testing
3. **Optional**: Core AIT³ works without it
4. **Learning**: Rails system will inform sync design

## 🤔 Open Questions for Gemini Consultation

1. **Memory Problem**: How can we make principles "stick" better with AI that forgets after 5 turns?
2. **Contextual Detection**: What's the best way to detect principle violations without over-engineering?
3. **User Experience**: How do we balance helpful reminders vs. annoying interruptions?
4. **Progressive Disclosure**: Is step-by-step mode helpful or does it break flow state?
5. **Hook Design**: Should hooks analyze code semantics or just file operations?
6. **Sync Architecture**: Event-driven hooks vs. polling for changes?
7. **Conflict Resolution**: Should we ever allow GitHub→Local sync to win?

## 📚 Appendix: Detailed Examples

### Example 1: Enhanced RED Phase
```bash
$ ait3 flow red 001
🔴 Starting RED Phase for Ticket #001: User Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Ticket Scope Analysis:
  • Files: src/auth/User.ts (create), src/auth/validators.ts (modify)
  • Test: tests/unit/auth/User.test.ts (create)
  
⚠️ Pre-flight Checks:
  ✓ No existing User.test.ts found (good to create)
  ⚡ Warning: validators.ts has 150+ lines. Consider focused changes
  
🎯 Your Testing Guidelines:
  1. KISS: Start with the happy path test
  2. DRY: Copy structure from tests/unit/services/LocalTicketService.test.ts
  3. YAGNI: Test only current requirements, not future features
  4. Real Objects: Use actual User class, not TestUser or MockUser
  
💭 Suggested First Test:
  "should create user with valid email and password"
  
Ready to create tests? The above scope is your boundary.
```

### Example 2: Dynamic GREEN Phase Warnings
```bash
$ ait3 flow green 001 --status
🟢 GREEN Phase Progress: Ticket #001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tests Passing: 2/5 (40%)
  • ✓ should create user with valid email
  • ✓ should hash password on creation
  • ✗ should validate email format
  • ✗ should require minimum password length
  • ✗ should prevent duplicate emails

📊 Code Analysis:
  ⚠️ New file detected: src/auth/interfaces/IUser.ts
     → Question: Is this interface used by multiple classes?
     → If not, consider adding to User.ts (YAGNI principle)
  
  ⚠️ Abstraction depth: 3 levels (User → BaseUser → Entity)
     → Reminder: KISS - Is this hierarchy necessary?
  
  ✓ Good: Modifying existing validators.ts
  ✓ Good: No test-specific classes detected

🎯 Next Step: Focus on "should validate email format" test
   Hint: Email validation already exists in validators.ts
```

### Example 3: Checkpoint Before Phase Transition
```bash
$ ait3 flow checkpoint 001
🔍 Phase Transition Checkpoint: RED → GREEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ RED Phase Completed Successfully:
  • 5 failing tests created
  • Covers all acceptance criteria
  • No implementation code added
  
📋 Scope Reminder for GREEN Phase:
  • ONLY make these tests pass
  • ONLY modify declared files:
    - src/auth/User.ts
    - src/auth/validators.ts
  • NO additional features

⚠️ Principle Checklist:
  □ Will you implement the minimum code to pass tests? (KISS)
  □ Will you avoid adding untested features? (YAGNI)  
  □ Will you reuse existing validation logic? (DRY)
  □ Will you resist creating unnecessary abstractions? (SOLID)
  
Type 'yes' to confirm understanding and proceed to GREEN phase...
```

---

*This document represents the refined development plan focusing on creating "straight rails" for AI behavior before tackling advanced features. The approach prioritizes immediate developer pain points and sustainable AI assistance patterns.*