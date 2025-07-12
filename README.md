# AIT³ - AI-Driven Development Platform

> **AIT³ (AI + Ticket + Test + Tool)** - Revolutionary development methodology featuring Socratic dialogue between Claude and Gemini with human judgment supreme

[![npm version](https://badge.fury.io/js/@morodomi%2Fait3.svg)](https://www.npmjs.com/package/@morodomi/ait3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## What is AIT³?

AIT³ is an AI-driven development platform that revolutionizes software engineering through intelligent collaboration between **Claude Code**, **Gemini**, and **human developers**. By implementing a **4-Phase AIT³ workflow**, it facilitates thoughtful decision-making through dialectical reasoning, where **human judgment remains supreme**.

### Socratic Foundation

AIT³ embodies **Socratic epistemology** - wisdom emerges through questioning, dialogue, and examining assumptions. Like Socrates, we embrace ignorance as the starting point for knowledge.

> *"The only true wisdom is in knowing you know nothing."* - Socrates

### Dialectical Process

**Claude-Gemini-Human Triad**: Technical decisions undergo structured intellectual combat:

1. **Thesis** (Claude): Proposes solution with clear rationale
2. **Antithesis** (Gemini): Challenges assumptions and identifies flaws  
3. **Synthesis** (Human): Weighs evidence and makes informed decisions

## What's New in v1.2.1

🔧 **Latest Fixes**:
- **GitHub API Consistency**: All methods now use modern `octokit.rest.*` pattern for future compatibility
- **Security Test Improvements**: Tests verify actual API behavior with malicious inputs

## What's New in v1.2.0

✨ **Zero ESLint Warnings Achievement**:
- **ESLint Configuration Excellence**: Smart configuration eliminated 42 warnings without manual fixes
- **Release Process Guide**: New `.claude/commands/release` for streamlined releases
- **Review Command**: Multi-agent code review with `ait3 install command review`
- **Type Safety**: Replaced all `any` types with `unknown` and proper type guards

## What's New in v1.1.0

🎉 **Major Features**:
- **GitHub Issues Integration**: Seamlessly switch between local and GitHub Issues backends
- **Simplified `ait3 init`**: Now generates 3 files for easy Claude Code integration
- **Backend Migration**: Move tickets between local and GitHub with `ait3 migrate`
- **Enhanced Security**: New `ait3 install security` command for Claude Code permissions
- **AI-Friendly Delete**: Smart ticket deletion with recovery hints
- **Better Error Messages**: Helpful guidance when arguments are missing

## Quick Start

### Installation

```bash
# Install globally
npm install -g @morodomi/ait3

# Verify installation
ait3 --version
```

### Initialize Your First Project

```bash
# NEW in v1.1: Simplified initialization
ait3 init
# Generates 3 files:
# - CLAUDE.ait3.md (temporary template)
# - .claude/CLAUDE.md (minimal working version)
# - .claude/commands/ait3-init (integration guide)

# Launch Claude Code and run:
claude
/ait3-init

# Create your first ticket
ait3 ticket create "Setup project structure"

# Start the AIT³ workflow
ait3 ticket start 0001
ait3 flow plan "project-setup"
```

## Core Commands

### Ticket Management
```bash
ait3 ticket create "Feature name"             # Create new ticket
ait3 ticket list                              # List all tickets
ait3 ticket start <id>                        # Start working on ticket
ait3 ticket complete <id>                     # Complete ticket
ait3 ticket show <id>                         # Show ticket details
ait3 ticket delete <id>                       # Delete ticket (NEW in v1.1)

# Backend Switching (NEW in v1.1)
ait3 setup ticket github                      # Use GitHub Issues
ait3 setup ticket local                       # Use local files
ait3 migrate local github                     # Migrate tickets to GitHub
```

### AIT³ Workflow
```bash
ait3 flow plan "feature-name"                 # PLANNING: Socratic dialogue

# All flow commands support both Local and GitHub ID formats:
ait3 flow red 001                             # RED: Create failing tests
ait3 flow red 123                             # Works with GitHub issues too
ait3 flow red #123                            # GitHub format with #

ait3 flow green 001                           # GREEN: Implement feature
ait3 flow refactor 001                        # REFACTOR: Optimize code
ait3 flow squash 001                          # SQUASH: Clean commits
```

### Project Analysis
```bash
ait3 analyze project                          # Analyze current project
ait3 init claude-md                           # Generate CLAUDE.md with analysis
ait3 install claude-md                        # Simple template generation
```

## AIT³ Workflow (AI + Ticket + Test + Tool)

### Backend Support

**Local Backend**: File-based tickets in `.tickets/` directory
**GitHub Backend**: GitHub Issues integration with API access

### ID Format Compatibility

| Backend | Format | Examples | Location Display |
|---------|--------|----------|------------------|
| **Local** | 4-digit zero-padded | `0001`, `0042` | `.tickets/doing/0001-feature.md` |
| **GitHub** | Issue numbers | `123`, `#123`, `1` | `https://github.com/owner/repo/issues/123` |

**Universal Support**: All `ticket` and `flow` commands accept both formats seamlessly.

### Phase 1: PLANNING (Socratic Dialogue)

**Purpose**: Validate approach through dialectical reasoning before implementation.

```bash
# 1. Claude proposes approach (works with both backends)
ait3 flow plan "user-authentication" --requirements "security,oauth,persistence"

# 2. Human reviews Claude's proposal, then challenges with Gemini
gemini -p "Critique Claude's approach for user authentication: [proposal-details]"

# 3. Human synthesizes decision and documents reasoning
git commit -m "planning(#123): chosen approach after dialectical analysis"
```

### Phase 2: RED (Test Creation)

**Purpose**: Create comprehensive tests that reflect ticket requirements.

```bash
# Create failing tests that define expected behavior
ait3 flow red 123

# Tests must:
# - Reflect ticket purpose and acceptance criteria
# - Cover edge cases and error conditions  
# - Assert on outcomes, not implementation details
# - Achieve 0% pass rate initially (all red)
```

### Phase 3: GREEN (Implementation)

**Purpose**: Implement minimal code to achieve 100% test pass rate.

```bash
# Implement feature with strict test compliance
ait3 flow green 123

# Requirements:
# - 100% test pass rate (non-negotiable)
# - Minimal implementation (no gold-plating)
# - Create tickets for mock implementations that need real code
```

### Phase 4: REFACTOR (Optimization)

**Purpose**: Improve code quality while maintaining 100% test coverage.

```bash
# Optimize structure, performance, and maintainability
ait3 flow refactor 123

# Focus areas:
# - Extract common patterns and utilities
# - Optimize performance bottlenecks
# - Improve error handling and logging
# - Identify and ticket remaining mock implementations
```

### Phase 5: SQUASH (Git Cleanup)

**Purpose**: Generate Git command suggestions for clean commit history.

```bash
# Generate Git command suggestions for clean history management
ait3 flow squash 123

# Provides:
# - Interactive rebase commands with commit grouping guidance
# - Comprehensive commit message templates
# - Safe push commands with --force-with-lease
# - Pull request creation guidance
```

## Backend Configuration

### Local Backend (Default)
File-based ticket management with markdown files in `.tickets/` directory.

```bash
# Configure local backend (default)
ait3 setup ticket local
```

### GitHub Issues Backend
Integration with GitHub Issues for team collaboration.

```bash
# Configure GitHub backend
ait3 setup ticket github --owner your-username --repo your-repo

# Requires GitHub token in environment
export GITHUB_TOKEN=your_github_token
```

## Claude Code Integration

### Automatic Setup

```bash
# Install all command guides
ait3 install command

# Installs:
# - .claude/commands/ait3 (AIT³ CLI commands guide)
# - .claude/commands/gemini (Gemini large codebase analysis guide)
```

### Usage with Claude Code

1. **Initialize and generate project context**:
   ```bash
   ait3 init
   # Follow the instructions to generate CLAUDE.md using /ait3-init in Claude Code
   ```

2. **In Claude Code, use the installed commands**:
   - `/ait3-init` - Interactive guide to generate CLAUDE.md
   - `/ait3` - Access AIT³ methodology and commands
   - `/gemini` - Large codebase analysis with Gemini

3. **Follow the AIT³ workflow**:
   - Claude proposes approaches
   - Use Gemini for challenging assumptions
   - Make informed human decisions

### Gemini Large Codebase Analysis

```bash
# Analyze entire codebase
gemini -p "@src/ @tests/ Analyze this project's architecture"

# Specific feature analysis
gemini -p "@src/auth/ @tests/auth/ Review authentication implementation"

# Challenge Claude's proposals
gemini -p "@src/ Critique this approach for [feature-name]"
```

## Project Analysis Features

### Multi-Language Detection
- **Node.js/TypeScript**: package.json, npm scripts
- **PHP**: composer.json, composer commands  
- **Python**: requirements.txt/pyproject.toml, poetry/pip
- **Go**: go.mod, go commands
- **Docker**: compose.yml/yaml + docker-compose.yml

### Smart Analysis
- **Dependency Analysis**: Automatic package detection
- **Command Detection**: Build, test, dev script identification  
- **Architecture Patterns**: Directory structure analysis
- **Framework Detection**: Technology stack recognition

## Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+ (strict mode)
- **Testing**: Vitest with comprehensive TDD coverage
- **CLI Framework**: Commander.js
- **Architecture**: Pure Functions + Service Injection

### Key Principles
- **Pure Functions**: Predictable, testable code
- **Service Injection**: Clean dependency management
- **100% Test Coverage**: Non-negotiable quality gate
- **Type Safety**: Zero `any` types in production code

## Example Workflows

### New Feature Development

```bash
# 1. Create and start ticket (works with both backends)
ait3 ticket create "User profile management"
ait3 ticket start 001    # Local format
# OR
ait3 ticket start 123    # GitHub format (if using GitHub backend)

# 2. PLANNING phase with AI collaboration
ait3 flow plan "user-profile" --requirements "crud,validation,security"
# → Claude proposes approach
# → Shows ticket location: Local file path OR GitHub URL
# → Challenge with Gemini: gemini -p "@src/ Critique this user profile approach"
# → Human decides on final approach

# 3. RED phase - create comprehensive tests
ait3 flow red 001        # Works with both Local and GitHub IDs
# → Creates failing tests for all requirements

# 4. GREEN phase - implement to pass tests
ait3 flow green 001      # Universal ID support
# → Minimal implementation for 100% test pass

# 5. REFACTOR phase - optimize and clean
ait3 flow refactor 001   # Cross-backend compatibility
# → Improve performance and maintainability

# 6. SQUASH phase - clean integration
ait3 flow squash 001     # Unified ID handling
# → Git command suggestions for clean history
# → Auto-completes ticket (Local: move to done, GitHub: close issue)
```

### Project Integration

```bash
# 1. Analyze existing codebase
ait3 analyze project --detailed

# 2. Setup complete integration
ait3 install command    # Install command guides
ait3 init claude-md     # Generate project-specific CLAUDE.md

# 3. Begin systematic improvement
ait3 ticket create "Migrate to AIT³ workflow"
ait3 ticket start 001
ait3 flow plan "ait3-migration"
```

## Philosophy

### Human-Centric AI Collaboration

While AI provides computational power and alternative perspectives, **human judgment remains supreme**:
- AI offers analysis, humans choose direction
- Context, intuition, and values guide final decisions
- Technology serves wisdom, not vice versa

### Refutation as Strength

Following **Karl Popper's falsifiability principle**, we actively seek to disprove our ideas:
- **Counterarguments are treasures**, not threats
- **Failed refutations strengthen confidence** in chosen approaches
- **Successful refutations prevent costly mistakes** in production

### Ultra-think with Structure

**Continuous flow state** with intelligent structure:
- Maintain momentum through AI collaboration
- Use tickets to manage context and scope
- Embrace rapid iteration with safety nets (tests, version control)
- Balance creativity with engineering discipline

## Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Detailed version history
- **[CLAUDE.md](CLAUDE.md)** - Complete project context for Claude Code
- **Philosophy**: Socratic methodology and dialectical reasoning
- **Workflow**: Complete AIT³ process documentation

## Contributing

AIT³ follows its own methodology for contributions:

1. **Create a ticket**: `ait3 ticket create "Your feature"`
2. **Follow AIT³ workflow**: PLANNING → RED → GREEN → REFACTOR → SQUASH
3. **Embrace dialectical reasoning**: Challenge assumptions with Gemini
4. **Maintain 100% test coverage**: All tests must pass
5. **Human judgment supreme**: Technical decisions require human synthesis

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Claude Code team** - Enabling seamless AI-human collaboration
- **Socratic tradition** - Wisdom through questioning and dialogue  
- **Karl Popper** - Falsifiability principle and scientific method
- **TDD community** - Evidence-based development practices

---

> *"Through questioning, we discover truth. Through testing, we ensure reliability. Through collaboration, we achieve excellence."*

**AIT³ - Where AI amplifies human wisdom.**