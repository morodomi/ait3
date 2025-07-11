# Project: @morodomi/ait3

## Overview
[Add project description here]

## Architecture
- **Language**: Node.js TypeScript
- **Framework**: TypeScript
- **Architecture Pattern**: Unknown
- **Test Framework**: Vitest
- **Build Tool**: npm

## Key Commands
```bash
npm install     # Install dependencies
npm run build       # Build the project
npm test        # Run tests
npm run dev         # Start development server
```

## Development Commands
- **Full Test**: `npm test`
- **Build**: `npm run build`
- **Development**: `npm run dev`

## Claude Code Actions
### Testing Commands
- **Full Test Suite**: `npm test`
- **Development Mode**: `npm run dev`

### Build Commands
- **Production Build**: `npm run build`
- **Install Dependencies**: `npm install`

## Development Workflow

## AIT³ Development Workflow

This project follows the AIT³ (AI + Ticket + Test + Tool) driven development workflow:

### Phase Flow
1. **PLANNING** → Socratic dialogue for approach validation
2. **RED** → Test-driven development with failing tests
3. **GREEN** → Implementation with 100% test pass rate
4. **REFACTOR** → Code optimization while maintaining tests
5. **SQUASH** → Git commit cleanup and integration

### Commands for Each Phase
- `ait3 flow plan "feature-name"` → Start planning phase
- `ait3 flow red 0028` → Create comprehensive tests
- `ait3 flow green 0028` → Implement feature
- `ait3 flow refactor 0028` → Optimize implementation
- `ait3 flow squash 0028` → Clean commit history

### Creating New Features
1. Create a ticket: `ait3 ticket create "Feature name"`
2. Start the ticket: `ait3 ticket start XXXX`
3. Follow the AIT³ phases (PLANNING → RED → GREEN → REFACTOR → SQUASH)
4. Complete: `ait3 ticket complete XXXX`

## Project Structure
```
src/
├── commands/       # Pure function commands
├── services/       # Service implementations
├── common/        # Shared utilities and types
└── assets/        # Templates and resources
```

## Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: Service and CLI testing
- **Test Coverage**: 100% target coverage
- **Framework**: Vitest

## Development Setup
1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Start development: `npm run dev`
4. Build project: `npm run build`

## AI Development Guidelines
When working with this codebase:
1. Follow AIT³ workflow phases
2. Maintain 100% test pass rate
3. Use pure functions + service injection pattern
4. Create tickets for complex features
5. Document architectural decisions

## AIT³ Development Methodology

AIT³ (AI + Ticket + Test + Tool driven development) implements a disciplined workflow:

### Workflow Phases
1. **PLANNING** - Dialectical reasoning with Claude and Gemini
2. **RED** - Test-first development (0% pass rate)
3. **GREEN** - Minimal implementation (100% pass rate)
4. **REFACTOR** - Code optimization (maintain 100% tests)
5. **SQUASH** - Git history cleanup

### Core Principles
- Claude proposes → Gemini challenges → Human decides
- Tests define behavior, not implementation
- 100% test pass rate before refactoring
- Create tickets for mock implementations
- Pure functions with service injection

### Commands
```bash
# Ticket management
ait3 ticket create "Feature name"
ait3 ticket start <id>
ait3 ticket complete <id>

# AIT³ workflow
ait3 flow plan <ticketId>
ait3 flow red <ticketId>
ait3 flow green <ticketId>
ait3 flow refactor <ticketId>
ait3 flow squash <ticketId>
```
