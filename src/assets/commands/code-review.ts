/**
 * Multi-agent code review command guide template
 * Provides structured approach for comprehensive code reviews using Claude and Gemini
 */
export const codeReviewTemplate = `# Multi-Agent Code Review

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

### Step 5: Create Tickets for Findings
After reviewing all perspectives, create tickets for issues that need action:

\`\`\`bash
# For critical issues:
ait3 ticket create "Fix security vulnerability: [specific issue from review]"
ait3 ticket create "Optimize performance: [specific bottleneck identified]"
ait3 ticket create "Refactor for maintainability: [specific improvement needed]"

# Optional: Document review completion
git add .
git commit -m "review(#TICKET): completed multi-agent code review

Review findings documented as tickets for future implementation"
\`\`\`

**Key Principle**: Review results should guide future work through ticket creation, not immediate commits of changes.

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