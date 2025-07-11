/**
 * AIT³ methodology template content
 */
export const AIT3_METHODOLOGY_TEMPLATE = `

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
\`\`\`bash
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
\`\`\`
`;

/**
 * Multi-agent review command guide template
 */
export const REVIEW_COMMAND_TEMPLATE = `# Multi-Agent Code Review

Perform comprehensive code reviews using multiple AI perspectives.

## Review Process

### Step 1: Correctness Review (Claude)
Review the current changes for correctness:
- Logic errors and bugs
- Edge case handling
- Adherence to requirements
- Code consistency

### Step 2: Performance Review (Gemini)
Switch to terminal and run:
\`\`\`bash
gemini -p "@src/ @tests/ Review these changes for performance:

Focus on:
- Algorithm efficiency
- Database query optimization
- Memory usage patterns
- Potential bottlenecks
- Async/await optimization"
\`\`\`

### Step 3: Security Review (Claude)
Review the changes for security issues:
- Input validation
- Authentication/authorization
- SQL injection risks
- XSS vulnerabilities
- Sensitive data exposure
- Dependency vulnerabilities

### Step 4: Synthesize Results
Create a summary that includes:
1. Critical issues from all reviews
2. Conflicting recommendations (if any)
3. Priority-ordered action items
4. Overall assessment

### Step 5: Document Decision
After human review, document the decision:
\`\`\`bash
git add .
git commit -m "review(#TICKET): implement review feedback

Correctness: [summary of fixes]
Performance: [optimizations made]
Security: [vulnerabilities addressed]

Human decision: [rationale for choices made]"
\`\`\`

## Quick Commands

For specific review types:
\`\`\`bash
# Performance only
gemini -p "@src/ Review this code for performance bottlenecks"

# Security only  
# In Claude: "Review this code for security vulnerabilities"

# Architecture review
gemini -p "@src/ @docs/ Is this architecture scalable and maintainable?"
\`\`\`

## Tips
- Run reviews after GREEN phase, before REFACTOR
- Document conflicting opinions in commit messages
- Keep context focused on specific changes
- Use ticket scope to limit review scope
`;

/**
 * ait3-init command guide template
 */
export const AIT3_INIT_GUIDE_TEMPLATE = `# Initialize Complete CLAUDE.md

This command integrates AIT³ methodology with your project-specific analysis.

## Instructions

### Step 1: Security Settings (Optional but Recommended)
If you want to restrict certain commands for security:
\`\`\`bash
ait3 install security
\`\`\`
This will update your .claude/settings.local.json with:
- Deny: curl, wget, rm
- Allow: grep, rg, ls, find (implicitly)

### Step 2: Analyze and Generate CLAUDE.md
1. Read CLAUDE.ait3.md for AIT³ template and project analysis
2. Read .claude/CLAUDE.md for current minimal version  
3. Analyze the project structure deeply
4. Generate comprehensive CLAUDE.md that:
   - Incorporates AIT³ methodology from the template
   - Includes project-specific details and analysis
   - Maintains the philosophical approach of AIT³
   - Adds any additional context from your analysis

### Step 3: Cleanup
Delete CLAUDE.ait3.md as it's no longer needed:
\`\`\`bash
rm CLAUDE.ait3.md
\`\`\`

## Key Sections to Include
- Project overview with AIT³ context
- Architecture and technology stack
- Development methodology (AIT³ workflow)
- Testing strategy and requirements
- AI collaboration patterns
- Project-specific guidelines

After generation, the CLAUDE.ait3.md file can be safely deleted.
`;