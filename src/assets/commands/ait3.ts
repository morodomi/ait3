export const ait3Template = `# AIT³ - AI-Driven Development Platform

AIT³ implements a disciplined AI + Ticket + Test + Tool driven development workflow. Each phase must be completed before proceeding to the next.

## Core Commands

### Ticket Management
\`\`\`bash
ait3 ticket create "Feature name"     # Create new ticket
ait3 ticket list                      # List all tickets
ait3 ticket show <id>                 # View ticket details
ait3 ticket start <id>                # Start working on ticket
ait3 ticket complete <id>             # Mark ticket as done
ait3 ticket undo <id>                 # Undo ticket to previous state
ait3 ticket delete <id>               # Delete a ticket (with --dry-run option)
\`\`\`

### Setup & Configuration
\`\`\`bash
ait3 setup ticket github              # Configure GitHub Issues backend
ait3 setup ticket local               # Configure local file backend
ait3 migrate local github             # Migrate tickets between backends
ait3 migrate github local --tickets "1,3-5"  # Migrate specific tickets
\`\`\`

### Project Analysis & Installation
\`\`\`bash
ait3 init claude-md                   # Generate CLAUDE.md with project analysis
ait3 install command                  # Install Claude Code command guides
ait3 analyze project                  # Analyze project structure and dependencies
\`\`\`

### AIT³ Workflow (MANDATORY SEQUENCE)

#### 1. PLANNING Phase - Socratic Dialogue
\`\`\`bash
ait3 flow plan <ticketId> [options]
\`\`\`
**Purpose**: Validate approach through dialectical reasoning BEFORE any implementation.

**Process**:
1. Claude proposes implementation approach with rationale
2. Challenge with Gemini: \`gemini -p "Critique this approach: [details]"\`
3. Human synthesizes competing perspectives and decides
4. Document decision reasoning in commit message

**IMPORTANT**: Never skip this phase. Failed refutations strengthen confidence.

#### 2. RED Phase - Test Creation
\`\`\`bash
ait3 flow red <ticketId>
\`\`\`
**Purpose**: Create comprehensive failing tests that define expected behavior.

**Requirements**:
- Tests MUST reflect ticket requirements, not implementation details
- All tests MUST fail initially (0% pass rate)
- Cover edge cases, error conditions, and happy paths
- Tests drive implementation, not vice versa

#### 3. GREEN Phase - Implementation
\`\`\`bash
ait3 flow green <ticketId>
\`\`\`
**Purpose**: Write minimal code to achieve 100% test pass rate.

**Constraints**:
- Achieve 100% test pass rate (non-negotiable)
- Minimal implementation only (no gold-plating)
- Mock external dependencies when needed
- Create tickets for mock implementations requiring real code

#### 4. REFACTOR Phase - Optimization
\`\`\`bash
ait3 flow refactor <ticketId>
\`\`\`
**Purpose**: Improve code quality while maintaining 100% test coverage.

**Focus Areas**:
- Extract common patterns and utilities
- Identify and ticket mock implementations
- Optimize performance bottlenecks
- Improve error handling and logging
- Enhance code readability

#### 5. SQUASH Phase - Git Integration
\`\`\`bash
ait3 flow squash <ticketId>
\`\`\`
**Purpose**: Provide Git command suggestions for clean commit history.

**Output**:
- Interactive rebase commands
- Commit message templates
- Safe push commands (--force-with-lease)
- PR creation commands (with --pr flag)
- Merge workflow guidance

**Note**: Commands are suggestions only. Human executes manually.

## AIT³ Philosophy

### Socratic Foundation
Wisdom emerges through questioning and dialogue. Embrace "I may know nothing" as the starting point.

### Dialectical Process
1. **Thesis** (Claude): Propose solution with reasoning
2. **Antithesis** (Gemini): Challenge assumptions and identify flaws
3. **Synthesis** (Human): Make informed decision

### Core Principles
- **Counterarguments are treasures**, not threats
- **Failed refutations strengthen confidence**
- **Successful refutations prevent bugs**
- **Human judgment remains supreme**
- **Tests define behavior, not implementation**

## Workflow Example

\`\`\`bash
# 1. Create and start ticket
ait3 ticket create "Add user authentication"
ait3 ticket start 0001

# 2. PLANNING - Validate approach
ait3 flow plan 0001
# Claude proposes JWT approach
# Challenge: gemini -p "@src/ Critique JWT auth approach"
# Human decides based on both perspectives

# 3. RED - Create failing tests
ait3 flow red 0001
# Write tests for auth endpoints, token validation, etc.
# Verify 0% pass rate

# 4. GREEN - Implement to pass tests
ait3 flow green 0001
# Write minimal code for 100% pass rate
# Mock email service → create ticket #0002

# 5. REFACTOR - Optimize implementation
ait3 flow refactor 0001
# Extract auth utilities, improve error handling
# Maintain 100% test coverage

# 6. SQUASH - Clean Git history
ait3 flow squash 0001
# Review suggested Git commands
# Execute manually with adjustments

# 7. Complete ticket
ait3 ticket complete 0001
\`\`\`

## Critical Rules

1. **NEVER skip phases** - Each phase serves a specific purpose
2. **NEVER modify tests to fit implementation** - Tests drive code
3. **NEVER accept <100% test pass in GREEN** - Non-negotiable
4. **NEVER implement without PLANNING** - Validate approach first
5. **ALWAYS document reasoning** - Future you will thank you

## Best Practices

- Use tickets for context management (LLM limitations)
- One ticket = one feature/fix (maintain focus)
- Create sub-tickets for discovered work
- Commit messages should include decision rationale
- Review Gemini critiques seriously, even if you disagree

## GitHub Integration (v1.1+)

### Initial Setup
\`\`\`bash
# Configure GitHub Issues backend
ait3 setup ticket github

# Auto-detects repository from git remote
# Validates gh CLI authentication
# Stores configuration in .tickets/config.json
\`\`\`

### Ticket Backend Switching
\`\`\`bash
# Switch to GitHub Issues
ait3 setup ticket github

# Switch back to local files
ait3 setup ticket local

# Migrate existing tickets
ait3 migrate local github        # All tickets
ait3 migrate local github --tickets "1,3-5"  # Specific tickets
\`\`\`

### Requirements
- GitHub CLI (\`gh\`) installed and authenticated
- Repository access permissions
- Issues enabled on GitHub repository

## Integration Tips

- Works with any language/framework
- Compatible with existing test runners
- Integrates with standard Git workflows
- Supports CI/CD pipelines
- Language-agnostic principles
- Seamless local ↔ GitHub ticket management

Remember: The goal is thoughtful, evidence-based development through structured collaboration between human wisdom and AI capabilities.
`;