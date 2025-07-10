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