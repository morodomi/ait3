export const geminiTemplate = `# Using Gemini CLI for AIT³ Development and Large Codebase Analysis

When working with AIT³ projects or analyzing large codebases that exceed Claude's context limits, use the Gemini CLI with its massive context window. Use \`gemini -p\` to leverage Google Gemini's large context capacity for TiDD workflow validation and architectural analysis.

## File and Directory Inclusion Syntax

Use the \`@\` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

### Basic Examples

**Single file analysis:**
\`\`\`bash
gemini -p "@src/commands/ticket/create.ts Explain this pure function's implementation"
\`\`\`

**Multiple files:**
\`\`\`bash
gemini -p "@package.json @src/cli.ts Analyze the CLI architecture and dependencies"
\`\`\`

**Entire directory:**
\`\`\`bash
gemini -p "@src/commands/ Summarize the pure function command architecture"
\`\`\`

**Multiple directories:**
\`\`\`bash
gemini -p "@src/services/ @tests/ Analyze service layer test coverage"
\`\`\`

**Full project analysis:**
\`\`\`bash
gemini -p "@./ Give me an overview of this AIT³ project"
# Or use --all_files flag:
gemini --all_files -p "Analyze the entire AIT³ project structure and patterns"
\`\`\`

## AIT³ TiDD Workflow Integration

### PLANNING Phase Validation
Use Gemini to challenge Claude's proposed approaches:

\`\`\`bash
# Challenge architectural decisions
gemini -p "@src/services/ @CLAUDE.md Critique the service injection pattern used in this project. Are there better alternatives?"

# Validate ticket requirements
gemini -p "@.tickets/doing/ @src/commands/ticket/ Does the ticket implementation match the requirements? What's missing?"

# Security analysis for planning
gemini -p "@src/ Are there security vulnerabilities in this authentication approach? What are the risks?"
\`\`\`

### RED Phase Test Analysis
\`\`\`bash
# Verify test completeness
gemini -p "@tests/ @src/commands/ Do the tests adequately cover all pure function behaviors? What edge cases are missing?"

# Test strategy validation
gemini -p "@tests/unit/ @tests/integration/ Is the test strategy appropriate for this TiDD workflow? Suggest improvements."

# Mock analysis
gemini -p "@src/ @tests/ Which mock implementations need to be converted to real implementations? Create tickets for them."
\`\`\`

### GREEN Phase Implementation Review
\`\`\`bash
# Code quality assessment
gemini -p "@src/commands/ Rate the code quality of these pure functions. What needs improvement?"

# Architecture compliance
gemini -p "@src/ @CLAUDE.md Does the implementation follow the documented architecture patterns? Point out deviations."

# Performance analysis
gemini -p "@src/ Identify performance bottlenecks in this implementation. Suggest optimizations."
\`\`\`

### REFACTOR Phase Optimization
\`\`\`bash
# Code duplication detection
gemini -p "@src/ Find code duplication and suggest refactoring opportunities."

# Pattern consistency
gemini -p "@src/commands/ @src/services/ Are the naming conventions and patterns consistent across the codebase?"

# Technical debt identification
gemini -p "@src/ Identify technical debt and maintenance issues. Prioritize by impact."
\`\`\`

## AIT³ Architecture Verification

### Service Layer Analysis
\`\`\`bash
# Interface compliance
gemini -p "@src/services/interfaces/ @src/services/implementations/ Do all implementations properly implement their interfaces?"

# Dependency injection validation
gemini -p "@src/cli.ts @src/commands/ Is dependency injection implemented correctly throughout the codebase?"

# Service boundaries
gemini -p "@src/services/ Are service responsibilities properly separated? Any violations of single responsibility principle?"
\`\`\`

### Pure Function Validation
\`\`\`bash
# Pure function verification
gemini -p "@src/commands/ Verify these are truly pure functions with no side effects. Flag any violations."

# Input/output consistency
gemini -p "@src/commands/ Do all command functions follow the (args, services) → CLIResult pattern consistently?"

# Error handling patterns
gemini -p "@src/commands/ @src/common/errors.ts Is error handling implemented consistently across all commands?"
\`\`\`

### Ticket System Analysis
\`\`\`bash
# Ticket format compliance
gemini -p "@.tickets/ @CLAUDE.md Do all tickets follow the specified markdown format? What's inconsistent?"

# Workflow validation
gemini -p "@.tickets/ @src/commands/ticket/ Does the ticket management implementation match the documented workflow?"

# Status tracking accuracy
gemini -p "@.tickets/ Are ticket statuses accurately reflecting the actual development state?"
\`\`\`

## Claude Code Integration Verification

### MCP Server Analysis
\`\`\`bash
# MCP configuration
gemini -p "@.claude/ @src/mcp/ Is the MCP server properly configured for Claude Code integration?"

# Command documentation
gemini -p "@.claude/commands/ Are the command guides accurate and up-to-date with the implementation?"

# Integration completeness
gemini -p "@src/ Does the codebase properly support all documented Claude Code integration features?"
\`\`\`

### Documentation Consistency
\`\`\`bash
# CLAUDE.md accuracy
gemini -p "@CLAUDE.md @src/ Does the documentation accurately reflect the current implementation?"

# Command reference validation
gemini -p "@CLAUDE.md @src/cli.ts Are all documented commands actually implemented?"

# Architecture documentation
gemini -p "@CLAUDE.md @src/ Does the documented architecture match the actual codebase structure?"
\`\`\`

## Advanced Analysis Patterns

### Security and Quality Assurance
\`\`\`bash
# Security vulnerability scan
gemini -p "@src/ Perform a security audit. Look for input validation issues, authentication flaws, and data exposure risks."

# Type safety verification
gemini -p "@src/ Check TypeScript strict mode compliance. Find any 'any' types or type safety violations."

# Performance profiling
gemini -p "@src/ Identify performance bottlenecks and memory leaks. Suggest optimization strategies."
\`\`\`

### Cross-cutting Concerns
\`\`\`bash
# Logging and monitoring
gemini -p "@src/ Is logging implemented consistently? Are there monitoring gaps?"

# Configuration management
gemini -p "@src/ How is configuration handled? Are there hardcoded values that should be configurable?"

# Internationalization readiness
gemini -p "@src/ Is the codebase ready for internationalization? What needs to be externalized?"
\`\`\`

### Migration and Upgrade Analysis
\`\`\`bash
# Dependency updates
gemini -p "@package.json @src/ Which dependencies can be safely updated? What are the breaking changes?"

# Legacy code identification
gemini -p "@src/ Identify legacy patterns that should be modernized. Prioritize by impact."

# Migration path planning
gemini -p "@src/ Plan a migration strategy for upgrading this codebase to newer patterns or frameworks."
\`\`\`

## TiDD Workflow Specific Queries

### Dialectical Analysis (Socratic Method)
\`\`\`bash
# Challenge assumptions
gemini -p "@src/ @CLAUDE.md Challenge the architectural assumptions in this codebase. What could go wrong?"

# Alternative approaches
gemini -p "@src/services/ What are alternative patterns to service injection? Compare pros and cons."

# Scale considerations
gemini -p "@src/ How will this architecture handle 10x scale? What are the breaking points?"
\`\`\`

### Continuous Improvement
\`\`\`bash
# Code review simulation
gemini -p "@src/ Perform a thorough code review. What would you flag in a pull request?"

# Best practices compliance
gemini -p "@src/ Compare this code against TypeScript and Node.js best practices. What needs improvement?"

# Future-proofing analysis
gemini -p "@src/ How future-proof is this architecture? What changes would be needed for emerging requirements?"
\`\`\`

## When to Use Gemini CLI for AIT³ Projects

Use \`gemini -p\` when:
- **TiDD Phase Validation**: Challenging Claude's proposals during PLANNING phase
- **Large Codebase Analysis**: Analyzing entire project structure exceeding Claude's context
- **Cross-file Pattern Recognition**: Finding inconsistencies across multiple files
- **Architecture Compliance**: Verifying implementation matches documented patterns
- **Security Auditing**: Comprehensive security analysis across all files
- **Refactoring Planning**: Identifying opportunities for code improvement
- **Test Coverage Analysis**: Ensuring comprehensive test coverage
- **Performance Optimization**: Finding bottlenecks across the entire codebase
- **Documentation Validation**: Ensuring docs match implementation

## Integration with TiDD Workflow

### PLANNING Phase
1. **Claude proposes** implementation approach
2. **Gemini challenges** via comprehensive codebase analysis
3. **Human synthesizes** final decision with full context

### Implementation Phases
- **RED**: Use Gemini to validate test comprehensiveness
- **GREEN**: Use Gemini to verify implementation quality
- **REFACTOR**: Use Gemini to identify optimization opportunities
- **SQUASH**: Use Gemini to ensure clean, consistent final state

## Important Notes for AIT³ Development

- **Context Awareness**: Gemini sees the entire codebase, unlike Claude's limited context
- **Architectural Validation**: Use for verifying pure function + service injection patterns
- **Ticket Integration**: Include \`.tickets/\` in analysis for workflow validation
- **Documentation Sync**: Regularly validate CLAUDE.md against implementation
- **Quality Assurance**: Use for comprehensive code quality and security analysis
- **Pattern Consistency**: Ensure all commands follow the established patterns
- **Future Planning**: Use for analyzing scalability and maintainability

## Claude Code Collaboration

When using with Claude Code:
1. **Use Gemini for analysis**: Get comprehensive project understanding
2. **Share insights with Claude**: Provide Gemini's findings to Claude for implementation
3. **Validate with Gemini**: Challenge Claude's implementation with Gemini's perspective
4. **Human synthesis**: Make final decisions based on both AI perspectives

This creates the ideal TiDD workflow: Claude proposes → Gemini refutes → Human decides.
`;