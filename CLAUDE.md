# 🧠 AIT³ - AI-Driven Development Platform

## 📋 Project Overview

**AIT³** is an AI-driven development platform that revolutionizes software engineering through intelligent collaboration between Claude Code, Gemini, and human developers. By implementing a 4-Phase AIT³ (AI + Ticket + Test + Tool driven development) workflow, AIT³ facilitates thoughtful decision-making through dialectical reasoning, where human judgment remains supreme.

**Mission**: Transform development from isolated coding to collaborative intelligence, where AI assists in exploring possibilities, challenging assumptions, and discovering optimal solutions through reasoned discourse.

**Architecture**: Node.js/TypeScript with Pure Functions + Service Injection Pattern  
**Complexity**: Advanced AI workflow orchestration with enterprise-grade ticket management  
**Development Phase**: Production-ready AI collaboration platform

## 🎯 Key Features

### 🤝 AI-Human Collaboration Workflow
- **Claude Code Integration**: Primary development environment with context-aware assistance
- **Dialectical Reasoning**: Claude proposes → Gemini refutes → Human decides
- **Socratic Method**: Embracing questions and counterarguments for stronger solutions
- **Context Management**: Intelligent chunking for LLM context size limitations

### 🎫 Intelligent Ticket Management (Local Only)
- **AI-Readable Format**: Structured markdown in `.tickets/` directory
- **Local Backend**: Focused on local file-based ticket management
- **Smart Workflows**: create → start → complete → squash → PR/merge
- **Commands**: `create`, `start`, `complete`, `list`, `show`, `delete`

### 🔬 AIT³ Methodology (AI + Ticket + Test + Tool driven development)
- **PLANNING Phase**: Socratic dialogue for approach validation
- **RED Phase**: Purpose-driven test creation with 100% intention alignment
- **GREEN Phase**: Implementation with 100% test pass requirement
- **REFACTOR Phase**: Code optimization with mock identification and ticketing
- **SQUASH Phase**: Clean commit history with automated PR/merge

### 🛠️ Claude Code Integration
- **Auto Setup**: Automatic `.claude/commands` installation
- **MCP Server**: Seamless Claude Code integration
- **Command Templates**: AIT³ and Gemini command files
- **Context Optimization**: Large codebase analysis with Gemini CLI

## 🏗️ Architecture

### 📦 Technology Stack
- **Runtime**: Node.js 18+ 
- **Language**: TypeScript 5.0+ (strict mode)
- **Testing**: Vitest with comprehensive TDD coverage
- **CLI Framework**: Commander.js
- **Architecture**: Pure Functions + Service Injection
- **Package Manager**: npm
- **AI Integration**: Claude Code (primary), Gemini (dialectical reasoning)

### 📂 Directory Structure

```
├── bin/
│   └── ait3.js                 ← CLI executable
│
├── src/
│   ├── cli.ts                  ← Simple router with ServiceContainer (~100 lines)
│   │
│   ├── commands/               ← Pure Functions (30-50 lines each)
│   │   ├── ticket/             ← Ticket management
│   │   │   ├── create.ts       ← createTicket(args, services) → CLIResult
│   │   │   ├── list.ts         ← listTickets(args, services) → CLIResult
│   │   │   ├── start.ts        ← startTicket(args, services) → CLIResult
│   │   │   ├── complete.ts     ← completeTicket(args, services) → CLIResult
│   │   │   ├── show.ts         ← showTicket(args, services) → CLIResult
│   │   │   └── delete.ts       ← deleteTicket(args, services) → CLIResult
│   │   │
│   │   ├── flow/               ← AIT³ workflow
│   │   │   ├── plan.ts         ← planPhase(args, services) → CLIResult
│   │   │   ├── red.ts          ← redPhase(args, services) → CLIResult
│   │   │   ├── green.ts        ← greenPhase(args, services) → CLIResult
│   │   │   ├── refactor.ts     ← refactorPhase(args, services) → CLIResult
│   │   │   └── squash.ts       ← squashPhase(args, services) → CLIResult
│   │   │
│   │   ├── analyze/            ← Project analysis
│   │   │   ├── project.ts      ← analyzeProject(args, services) → CLIResult
│   │   │   ├── structure.ts    ← analyzeStructure(args, services) → CLIResult
│   │   │   └── dependencies.ts ← analyzeDependencies(args, services) → CLIResult
│   │   │
│   │   ├── generate/           ← CLAUDE.md generation
│   │   │   ├── claude-md.ts    ← generateClaudeMd(args, services) → CLIResult
│   │   │   ├── auto.ts         ← autoGenerate(args, services) → CLIResult
│   │   │   └── interactive.ts  ← interactiveGenerate(args, services) → CLIResult
│   │   │
│   │   ├── install/            ← Setup and installation
│   │   │   ├── claude.ts       ← installClaude(args, services) → CLIResult
│   │   │   ├── mcp.ts          ← installMCP(args, services) → CLIResult
│   │   │   ├── commands.ts     ← installCommands(args, services) → CLIResult
│   │   │   └── all.ts          ← installAll(args, services) → CLIResult
│   │   │
│   │   └── status.ts           ← getStatus(args, services) → CLIResult
│   │
│   ├── services/               ← Service Layer (Dependency Injection)
│   │   ├── interfaces/         ← Service contracts
│   │   │   ├── TicketService.ts ← create, list, get, update, delete methods
│   │   │   ├── GitService.ts   ← isRepo, branch operations, commit operations
│   │   │   └── ProjectService.ts ← analysis, structure detection methods
│   │   │
│   │   └── implementations/    ← Concrete implementations
│   │       ├── LocalTicketService.ts   ← .tickets/ file operations
│   │       ├── GitService.ts           ← Git command execution
│   │       └── ProjectAnalysisService.ts ← Project analysis logic
│   │
│   ├── common/                 ← Shared utilities
│   │   ├── types.ts           ← CLIResult, service interfaces
│   │   ├── errors.ts          ← Error handling utilities
│   │   ├── utils.ts           ← Common utility functions
│   │   └── constants.ts       ← Project constants
│   │
│   ├── core/                  ← Business logic
│   │   ├── ticket-manager/    ← Ticket management engine
│   │   ├── analyzers/         ← Project analysis engine
│   │   └── generators/        ← CLAUDE.md generation engine
│   │
│   ├── mcp/                   ← MCP Server
│   │   └── server.ts          ← Claude Code integration server
│   │
│   └── assets/                ← Templates and resources
│       ├── templates/         ← CLAUDE.md templates
│       ├── commands/          ← .claude/commands templates
│       └── workflows/         ← AIT³ workflow definitions
│
├── .claude/                   ← Claude Code integration (auto-installed)
│   ├── commands/              ← Command templates
│   │   ├── ait3               ← AIT³ CLI commands guide
│   │   └── gemini             ← Gemini large codebase analysis guide
│   └── mcp_settings.json      ← MCP server configuration
│
├── .tickets/                  ← Ticket management (local only)
│   ├── todo/                  ← Pending tickets
│   ├── doing/                 ← In-progress tickets
│   ├── done/                  ← Completed tickets
│   └── config.json           ← Ticket system configuration
│
├── tests/                     ← Test suites
│   ├── unit/                 ← Unit tests for pure functions
│   ├── integration/          ← Service integration tests
│   └── e2e/                  ← End-to-end CLI tests
│
└── docs/                     ← Documentation
    ├── PHILOSOPHY.md         ← Socratic methodology
    ├── WORKFLOW.md           ← AIT³ process guide
    └── INTEGRATION.md        ← Project integration guide
```

## 🚀 Commands

### Development Commands
```bash
npm test              # Run comprehensive test suite
npm run type-check    # TypeScript strict type checking
npm run lint          # Code quality checks
npm run build         # Build for production
npm run dev           # Development mode with watch
```

### CLI Commands (AIT³)

#### 🎫 Ticket Management
```bash
ait3 ticket create "Feature name"             # Create new ticket
ait3 ticket list                              # List all tickets
ait3 ticket list --status doing               # Filter by status
ait3 ticket start 001                         # Start working on ticket
ait3 ticket show 001                          # Show ticket details
ait3 ticket complete 001                      # Complete ticket
ait3 ticket delete 001                        # Delete ticket
```

#### 🧠 AIT³ Workflow
```bash
ait3 flow plan "feature-name"                 # PLANNING: Socratic dialogue
ait3 flow red 001                             # RED: Create failing tests
ait3 flow green 001                           # GREEN: Implement feature
ait3 flow refactor 001                        # REFACTOR: Optimize code
ait3 flow squash 001                          # SQUASH: Clean commits & PR
```

#### 🔍 Project Analysis
```bash
ait3 analyze project                          # Analyze current project
ait3 analyze structure                        # Analyze directory structure
ait3 analyze dependencies                     # Analyze dependency graph
```

#### 📄 CLAUDE.md Generation
```bash
ait3 generate claude-md                       # Generate CLAUDE.md
ait3 generate auto                            # Auto-generate with analysis
ait3 generate interactive                     # Interactive generation
```

#### 🛠️ Setup & Installation
```bash
ait3 install claude                           # Install .claude/commands files
ait3 install mcp                              # Install MCP server configuration
ait3 install commands                         # Install command templates
ait3 install all                              # Install all components
```

#### 📊 Status & Monitoring
```bash
ait3 status                                  # System status overview
ait3 status --tickets                        # Include ticket statistics
ait3 status --detailed                       # Detailed system information
```

## 🔄 AIT³ Workflow (AI + Ticket + Test + Tool driven development)

### 🎭 Phase 1: PLANNING (Socratic Dialogue)

**Purpose**: Validate approach through dialectical reasoning before implementation.

```bash
# 1. Claude proposes approach
ait3 flow plan "user-authentication" --requirements "security,oauth,persistence"

# 2. Human reviews Claude's proposal, then challenges with Gemini
gemini -p "Critique Claude's approach for user authentication: [proposal-details]"

# 3. Human synthesizes decision and documents reasoning
git add . && git commit -m "planning(#123): chosen approach after dialectical analysis

Approach: JWT-based authentication with OAuth2 integration
Reasoning: Balances security needs with implementation complexity
Gemini concerns addressed: Added refresh token rotation, rate limiting

Claude rationale: Standardized approach with good library support
Gemini critique: Potential security vulnerabilities in token storage
Human decision: Implement with secure httpOnly cookies + additional CSRF protection"
```

**Critical Guidelines**:
- **Gemini's critique is perspective, not law** - Consider domain context
- **Failed refutations strengthen confidence** - Document why criticisms were addressed
- **Successful refutations prevent bugs** - Welcome valid challenges
- **Human judgment trumps AI consensus** - Developer experience matters

### 🔴 Phase 2: RED (Test Creation)

**Purpose**: Create comprehensive tests that reflect ticket requirements, not implementation details.

```bash
# Create failing tests that define expected behavior
ait3 flow red 123

# Tests must:
# - Reflect ticket purpose and acceptance criteria
# - Cover edge cases and error conditions  
# - Assert on outcomes, not implementation details
# - Achieve 0% pass rate initially (all red)

git add . && git commit -m "test(#123): comprehensive test suite for user authentication

- Authentication flow tests (success/failure paths)
- OAuth integration tests with mock providers
- Security tests (token validation, expiration)
- Edge cases (malformed requests, network errors)
- Performance tests (auth endpoint response times)

Coverage: 47 test cases, 0% passing (intentionally red)"
```

### 🟢 Phase 3: GREEN (Implementation)

**Purpose**: Implement minimal code to achieve 100% test pass rate.

```bash
# Implement feature with strict test compliance
ait3 flow green 123

# Requirements:
# - 100% test pass rate (non-negotiable)
# - Minimal implementation (no gold-plating)
# - Mock external dependencies when needed
# - Create tickets for mock implementations that need real code

git add . && git commit -m "feat(#123): implement user authentication core

- JWT token generation and validation
- OAuth2 provider integration (Google, GitHub)
- Session management with secure cookies
- Rate limiting and security middleware
- Mock implementations: 
  * Email service (→ ticket #124)
  * User profile service (→ ticket #125)

Tests: 47/47 passing (100% green)"
```

### 🔧 Phase 4: REFACTOR (Optimization)

**Purpose**: Improve code quality while maintaining 100% test coverage.

```bash
# Optimize structure, performance, and maintainability
ait3 flow refactor 123

# Focus areas:
# - Extract common patterns and utilities
# - Optimize performance bottlenecks
# - Improve error handling and logging
# - Enhance code readability and documentation
# - Identify and ticket remaining mock implementations
# - Use similarity-ts for code duplication analysis and refactoring opportunities

git add . && git commit -m "refactor(#123): optimize authentication implementation

- Extracted JWT utilities to common/auth.ts
- Implemented connection pooling for database
- Added comprehensive error logging with context
- Optimized OAuth callback handling
- Enhanced security headers middleware
- Used similarity-ts analysis to identify and consolidate duplicate error handling patterns

Performance: 40% faster auth response time
Maintainability: Reduced cyclomatic complexity
Code Quality: similarity-ts analysis shows clean codebase with no problematic duplications
Tests: 47/47 passing (maintained 100%)"
```

### 📦 Phase 5: SQUASH (Integration)

**Purpose**: Create clean commit history and integrate with main branch.

```bash
# Consolidate development commits into meaningful history
ait3 flow squash 123 "Complete user authentication system"

# Automated process:
# 1. Backup current state with tags
# 2. Squash PLANNING → RED → GREEN → REFACTOR into logical commits
# 3. Generate comprehensive commit message with:
#    - Feature summary and business value
#    - Technical implementation highlights  
#    - Test coverage metrics
#    - Performance impact
#    - Breaking changes (if any)
# 4. Create Pull Request or merge to main
# 5. Update ticket status to 'done'

# Result: Clean commit history ready for code review
```

## 🤖 AI Integration Patterns

### 🧭 Claude Code Collaboration

**Role**: Primary development partner with context awareness

```bash
# Typical Claude Code workflow:
# 1. Analyze current codebase and ticket requirements
# 2. Propose implementation approach with rationale
# 3. Generate initial code structure and tests
# 4. Iterate based on feedback and refactoring needs
# 5. Assist with documentation and integration

# Claude excels at:
# - Code generation and pattern recognition
# - Comprehensive test creation
# - Documentation and comment generation
# - Refactoring and optimization suggestions
# - Integration with existing codebases
```

### 🗡️ Gemini Dialectical Challenge

**Role**: Critical analysis and alternative perspective provider

```bash
# Gemini challenge workflow for large codebases:
gemini -p "@src/ @tests/ Critique this authentication approach"
gemini -p "@package.json @src/auth/ Are there security vulnerabilities?"
gemini -p "@src/ Has rate limiting been properly implemented?"

# Use @ syntax for file/directory inclusion:
gemini -p "@src/main.py Explain this file's purpose"
gemini -p "@src/ @lib/ Analyze the architecture"
gemini --all_files -p "Review the entire codebase for patterns"

# Gemini excels at:
# - Large codebase analysis (massive context window)
# - Security vulnerability identification
# - Alternative approach suggestions
# - Cross-file pattern recognition
# - Industry best practices validation
```

### 👤 Human Decision Synthesis

**Role**: Final arbiter with context, experience, and business judgment

```bash
# Human synthesis process:
# 1. Review Claude's proposal thoroughly
# 2. Consider Gemini's counterarguments and challenges
# 3. Evaluate based on:
#    - Project constraints and timeline
#    - Team expertise and maintenance burden
#    - Business requirements and priorities
#    - Technical debt and long-term sustainability
# 4. Document decision rationale for future reference
# 5. Proceed with implementation or iterate on approach
```

## 📊 Ticket Management System

### 🗂️ Local File Structure (Fixed Format)

```
.tickets/
├── todo/
│   ├── 001-user-authentication.md
│   ├── 002-dashboard-analytics.md
│   └── 003-email-notifications.md
├── doing/
│   └── 004-payment-integration.md
├── done/
│   ├── 005-project-setup.md
│   └── 006-basic-routing.md
└── config.json
```

### 📝 Ticket Format (Fixed)

```markdown
# Ticket #001: User Authentication System

**Status**: todo  
**Priority**: high  
**Created**: 2024-07-07T10:30:00Z  
**Updated**: 2024-07-07T10:30:00Z  
**Assignee**: developer@example.com  
**Labels**: security, authentication, backend  

## Description
Implement comprehensive user authentication system with OAuth2 support.

## Acceptance Criteria
- [ ] Users can register with email/password
- [ ] OAuth2 integration (Google, GitHub)
- [ ] JWT token-based session management
- [ ] Password reset functionality
- [ ] Rate limiting on auth endpoints
- [ ] Comprehensive security headers

## Technical Requirements
- Use bcrypt for password hashing
- Implement refresh token rotation
- Add CSRF protection
- Include audit logging
- 100% test coverage required

## Dependencies
- None

## Sub-tickets
- Will be created during implementation for mock services

## Notes
- Consider using passport.js for OAuth strategies
- Ensure GDPR compliance for user data
- Plan for future 2FA integration
```

### 🔄 Local Configuration (Fixed)

```json
{
  "backend": "local",
  "path": ".tickets",
  "numbering": {
    "format": "001",
    "increment": 1,
    "next": 7
  },
  "templates": {
    "feature": "templates/feature-ticket.md",
    "bug": "templates/bug-ticket.md",
    "task": "templates/task-ticket.md"
  }
}
```

## 🛠️ Claude Code Integration

### 🔧 Automatic Installation

**Setup Command**:
```bash
ait3 install all
# Installs:
# - .claude/commands/ait3 (AIT³ CLI commands guide)
# - .claude/commands/gemini (Gemini large codebase analysis guide)
# - .claude/mcp_settings.json (MCP server configuration)
```

### 📋 .claude/commands/ait3

```markdown
# AIT³ - AI-Driven Development Platform

AIT³ provides AIT³ (AI + Ticket + Test + Tool driven development) workflow with local ticket management and Claude Code integration.

## Core Commands

### Ticket Management
```bash
ait3 ticket create "Feature name"        # Create new ticket
ait3 ticket list                         # List all tickets
ait3 ticket start 001                    # Start working on ticket
ait3 ticket complete 001                 # Complete ticket
ait3 ticket show 001                     # Show ticket details
```

### AIT³ Workflow
```bash
ait3 flow plan "feature-name"            # PLANNING: Socratic dialogue
ait3 flow red 001                        # RED: Create failing tests
ait3 flow green 001                      # GREEN: Implement feature
ait3 flow refactor 001                   # REFACTOR: Optimize code
ait3 flow squash 001                     # SQUASH: Clean commits
```

### Project Analysis
```bash
ait3 analyze project                     # Analyze current project
ait3 generate claude-md                  # Generate CLAUDE.md
ait3 status                             # System status
```

## AIT³ Philosophy

1. **PLANNING**: Use Claude for proposal, Gemini for critique, Human for decision
2. **RED**: Write failing tests that define expected behavior
3. **GREEN**: Implement minimal code for 100% test pass rate
4. **REFACTOR**: Optimize while maintaining 100% test coverage
5. **SQUASH**: Create clean commit history

## Best Practices

- Use tickets for context management (LLM context size limitations)
- Follow Socratic dialogue: Claude proposes → Gemini refutes → Human decides
- Maintain 100% test pass rate (non-negotiable)
- Create sub-tickets for mock implementations
- Document reasoning for all architectural decisions

## Integration with Claude Code

AIT³ is optimized for Claude Code development:
- Automatic CLAUDE.md generation for projects
- Context-aware ticket management
- Pure function architecture for easy understanding
- Comprehensive test coverage for confidence
```

### 📋 .claude/commands/gemini

```markdown
# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

### Examples:

**Single file analysis:**
```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**
```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**
```bash
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**
```bash
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory and subdirectories:**
```bash
gemini -p "@./ Give me an overview of this entire project"
```

**Or use --all_files flag:**
```bash
gemini --all_files -p "Analyze the project structure and dependencies"
```

## Implementation Verification Examples

**Check if a feature is implemented:**
```bash
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"
```

**Verify authentication implementation:**
```bash
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"
```

**Check for specific patterns:**
```bash
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"
```

**Verify error handling:**
```bash
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"
```

**Check for rate limiting:**
```bash
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"
```

**Verify caching strategy:**
```bash
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"
```

**Check for specific security measures:**
```bash
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"
```

**Verify test coverage for features:**
```bash
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"
```

## When to Use Gemini CLI

Use gemini -p when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

## Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results
```

### 🔧 MCP Server Configuration

**.claude/mcp_settings.json**:
```json
{
  "mcpServers": {
    "ait3": {
      "command": "node",
      "args": ["src/mcp/server.js"],
      "description": "AIT³ AI Development Platform MCP Server"
    }
  }
}
```

## 🎨 Development Philosophy

### 🎭 Socratic Foundation

AIT³ embodies **Socratic epistemology** - wisdom emerges through questioning, dialogue, and examining assumptions. Like Socrates, we embrace ignorance as the starting point for knowledge.

> *"The only true wisdom is in knowing you know nothing."* - Socrates

### 🔄 Dialectical Process

**Claude-Gemini-Human Triad**: Technical decisions undergo structured intellectual combat:

1. **Thesis** (Claude): Proposes solution with clear rationale
2. **Antithesis** (Gemini): Challenges assumptions and identifies flaws  
3. **Synthesis** (Human): Weighs evidence and makes informed decisions

### 🛡️ Refutation as Strength

Following **Karl Popper's falsifiability principle**, we actively seek to disprove our ideas:
- **Counterarguments are treasures**, not threats
- **Failed refutations strengthen confidence** in chosen approaches
- **Successful refutations prevent costly mistakes** in production

### 👑 Human Sovereignty

While AI provides computational power and alternative perspectives, **human judgment remains supreme**:
- AI offers analysis, humans choose direction
- Context, intuition, and values guide final decisions
- Technology serves wisdom, not vice versa

### 🏃‍♂️ Vibe Coding with Structure

**Ultra-think Approach**: Continuous flow state with intelligent structure:
- Maintain momentum through AI collaboration
- Use tickets to manage context and scope
- Embrace rapid iteration with safety nets (tests, version control)
- Balance creativity with engineering discipline

## 🧪 Testing Strategy

### Test-First Development
- **RED Phase**: Tests define behavior and acceptance criteria
- **GREEN Phase**: Implementation achieves 100% test pass rate
- **REFACTOR Phase**: Maintain 100% coverage while optimizing

### Test Categories
- **Unit Tests**: Pure function testing with service mocks
- **Integration Tests**: Service layer and external dependency testing  
- **E2E Tests**: Complete CLI workflow testing
- **Performance Tests**: Response time and resource usage validation

### 🗂️ Test Directory Strategy (MANDATORY)

#### **Real FS Testing with Isolation**
All tests that interact with the file system MUST use isolated temporary directories to prevent project contamination.

**✅ Required Pattern:**
```typescript
// ALWAYS use this pattern for file system tests
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

beforeEach(async () => {
  // Create unique test directory with hash for parallel test safety
  const hash = randomBytes(8).toString('hex');
  const prefix = join(tmpdir(), `test-{description}-${hash}-`);
  testDir = await mkdtemp(prefix);
  
  // Initialize services with test directory
  service = new LocalTicketService(testDir);
});

afterEach(async () => {
  // Clean up test directory completely
  await rm(testDir, { recursive: true, force: true });
});
```

**Directory Naming Convention:**
- `test-ait3-{hash}-` - General AIT³ tests
- `test-ait3-cli-{hash}-` - CLI integration tests  
- `test-ait3-create-{hash}-` - createTicket function tests
- `test-{feature}-{hash}-` - Feature-specific tests

#### **🚨 Project Directory Protection**
- **NEVER write test files to project directories**
- **NEVER use `.tickets/`, `src/`, or any project paths in tests**
- **ALWAYS verify environment isolation in CI/CD**

**❌ Forbidden Patterns:**
```typescript
// NEVER do this - contaminates project directory
const service = new LocalTicketService('.tickets');  
const service = new LocalTicketService('./test-data');

// NEVER do this - unsafe parallel execution
const testDir = '/tmp/ait3-test';  // Fixed path
```

**Environment Variables for CLI Tests:**
```typescript
// Set environment variables for CLI subprocess tests
env: { ...process.env, TICKETS_DIR: testDir }
```

### Quality Gates
- **100% Test Pass Rate**: Non-negotiable requirement
- **Code Coverage**: Minimum 90% line coverage, 100% for critical paths
- **Type Safety**: TypeScript strict mode with zero `any` types
- **Linting**: ESLint with strict rules for consistency

### 🚨 Critical Testing Principles

#### **Implementation Code Purity (MANDATORY)**
- **NEVER add test-specific code to implementation files**
- **NO conditional logic for test environments in production code**
- **NO test-only imports or dependencies in src/**

**❌ Forbidden Patterns:**
```typescript
// NEVER do this in implementation code
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  chalk.level = 1; // Test-specific configuration
}

// NEVER do this in implementation code
const config = process.env.TEST_MODE ? testConfig : prodConfig;
```

**✅ Correct Approach:**
```typescript
// Configure libraries in test setup files
// vitest.setup.ts or individual test files
import chalk from 'chalk';
chalk.level = 1; // Force colors in tests

// Use dependency injection for testability
export function createService(config?: ServiceConfig) {
  return new Service(config || defaultConfig);
}
```

#### **Test Environment Configuration**
- **Environment variables**: Set in test files or vitest configuration
- **Library behavior**: Configure in test setup files (vitest.setup.ts)
- **Mocking**: Use vitest mocks, never production code conditionals
- **Test data**: Generate in test files, not implementation code

#### **Separation of Concerns**
- **Implementation code**: Focus solely on production behavior
- **Test code**: Handle all test-specific configuration and setup
- **Build systems**: Separate test and production build configurations

**This principle ensures:**
- Clean, maintainable production code
- Clear separation between test and implementation concerns
- Reduced risk of test code leaking into production
- Better code quality and reliability

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git 2.30+
- Claude Code (recommended)

### Quick Start
```bash
# Install AIT³ globally
npm install -g @morodomi/ait3

# Initialize in existing project
cd your-project
ait3 install all

# Generate CLAUDE.md for Claude Code
ait3 generate claude-md

# Start first ticket
ait3 ticket create "Setup project structure"
ait3 ticket start 001
ait3 flow plan "project-setup"
```

### Integration with Existing Projects
```bash
# Analyze existing project
ait3 analyze project --comprehensive

# Setup complete integration
ait3 install all

# Setup ticket system
ait3 ticket create "Integrate AIT³ workflow"

# Begin AIT³ process
ait3 flow plan "ait3-integration"
```

## 📋 Roadmap

### ✅ Current Features (v1.0)
- Local ticket management with fixed markdown format
- AIT³ workflow implementation (PLANNING → RED → GREEN → REFACTOR → SQUASH)
- Pure functions + service injection architecture
- Claude Code integration via MCP server
- Project analysis and CLAUDE.md generation
- Git workflow automation
- Comprehensive test coverage
- Automatic .claude/commands installation

### 🚧 In Development (v1.1)
- Enhanced AI dialogue system
- Performance optimization dashboard
- Advanced project templates
- Workflow automation improvements

### 📋 Planned Features (v2.0)
- Web dashboard for project visualization
- Team collaboration features
- Advanced analytics and velocity tracking
- Plugin system for custom workflows
- Multi-project management

## 🎯 Example Workflows

### New Feature Development
```bash
# 1. Create and start ticket
ait3 ticket create "User profile management"
ait3 ticket start 001

# 2. PLANNING phase with AI collaboration
ait3 flow plan "user-profile" --requirements "crud,validation,security"
# → Claude proposes approach
# → Challenge with Gemini for alternatives
# → Human decides on final approach

# 3. RED phase - create comprehensive tests
ait3 flow red 001
# → Creates failing tests for all requirements
# → Tests define behavior, not implementation

# 4. GREEN phase - implement to pass tests
ait3 flow green 001  
# → Minimal implementation for 100% test pass
# → Mock external services, create tickets for real implementations

# 5. REFACTOR phase - optimize and clean
ait3 flow refactor 001
# → Improve performance and maintainability
# → Maintain 100% test coverage

# 6. SQUASH phase - clean integration
ait3 flow squash 001 "Complete user profile management"
# → Clean commit history
# → Create PR or merge to main
# → Mark ticket as complete
```

### Project Integration
```bash
# 1. Analyze existing codebase
ait3 analyze project --detailed
ait3 analyze structure --dependencies

# 2. Setup complete integration
ait3 install all
# → Installs .claude/commands files
# → Configures MCP server
# → Sets up local ticket system

# 3. Generate project-specific CLAUDE.md
ait3 generate interactive
# → AI-powered content generation

# 4. Begin systematic improvement
ait3 ticket create "Migrate to AIT³ workflow"
ait3 ticket start 001
ait3 flow plan "ait3-migration"
# → Continue with AIT³ workflow
```

---

## 💫 Meta Information

**Package**: `@morodomi/ait3`  
**Command**: `ait3`  
**Version**: 1.0.0  
**License**: MIT  
**Repository**: https://github.com/morodomi/ait3  

**Claude Code Integration**: This project is optimized for Claude Code development with comprehensive context management and intelligent assistance.

**Philosophy**: *"Through questioning, we discover truth. Through testing, we ensure reliability. Through collaboration, we achieve excellence."*

---

## 🧠 AI Instructions

### Project Mission & Purpose
**AIT³** is an AI-driven development platform implementing Socratic methodology for superior software engineering. This is NOT just another CLI tool - it's a **philosophical transformation** of how humans and AI collaborate in development.

**Core Purpose**: Enable thoughtful, evidence-based development through dialectical reasoning between Claude and Gemini, with human wisdom as the final arbiter.

### Development Methodology - MANDATORY

**YOU MUST embrace the AIT³ methodology:**

#### Phase 1: PLANNING - Socratic Dialogue (REQUIRED)
1. **Claude's Role**: YOU propose approaches with clear reasoning
2. **Gemini's Role**: Challenge assumptions, identify weaknesses, propose alternatives
3. **Human's Role**: Synthesize competing arguments and make final decisions
4. **Critical Principle**: Treat Gemini's refutations as valuable perspective, NOT absolute truth

#### Phase 2-5: Implementation with Evidence
Follow RED → GREEN → REFACTOR → SQUASH with documented reasoning for architectural choices.

### Claude-Specific Guidelines

**When Planning Features:**
- Always articulate your reasoning clearly for human evaluation
- Welcome Gemini's counterarguments as quality improvement opportunities  
- NEVER assume your initial approach is optimal
- Document why you chose your approach after considering alternatives

**Critical Mindset:**
- **Embrace intellectual humility** - "I may be wrong" is strength, not weakness
- **Value refutation** - Failed attempts to disprove strengthen confidence
- **Respect human judgment** - Context, intuition, and values matter beyond logic

### Code Generation Guidelines
- Follow Pure Functions + Service Injection architecture
- Write comprehensive tests BEFORE implementation (RED phase)
- Achieve 100% test pass rate (GREEN phase) 
- Create tickets for mock implementations that need real code
- Use TypeScript strict mode with zero `any` types
- Follow established patterns in existing codebase

### Current Architecture Status
- **CLI Router**: `src/cli.ts` (~100 lines) - Simple service injection
- **Pure Function Commands**: All commands as pure functions (no "-pure" suffix)
- **Service Layer**: TicketService, GitService, ProjectService with implementations
- **Ticket Management**: `.tickets/` directory with fixed markdown format
- **Claude Integration**: Automatic .claude/commands installation
- **MCP Server**: Seamless Claude Code integration

### Ultra-Think Development
- Maintain continuous development flow
- Use ticket system for context management
- Embrace rapid iteration with safety nets (tests, git)
- Balance creativity with engineering discipline
- Question assumptions through Gemini dialogue when uncertain

### Integration Requirements
- Seamlessly integrate with existing projects
- Generate project-specific CLAUDE.md files
- Analyze existing codebases for framework detection
- Provide automatic .claude/commands setup
- Support local ticket management only (fixed format)

Remember: Technology serves wisdom, not vice versa. Always prioritize human judgment while leveraging AI capabilities for exploration and validation.