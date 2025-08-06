# Multi-Agent Code Review

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
```bash
gemini -p "@src/ @tests/ Review these changes for performance:

Focus on:
- Algorithm efficiency
- Database query optimization
- Memory usage patterns
- Potential bottlenecks
- Async/await optimization"
```

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

### Step 5: Prioritize and Select Issues for Ticketing

Categorize findings by priority:

**🔴 Critical (Immediate Action Required):**
- Security vulnerabilities that expose data
- Logic errors causing system failure
- Performance issues blocking user experience

**🟡 Important (Should Address Soon):**
- Code maintainability improvements
- Minor performance optimizations  
- Non-critical security hardening

**🟢 Optional (Nice to Have):**
- Style consistency improvements
- Documentation updates
- Refactoring for readability

**Next Steps - Please Select:**

1. **Which issues would you like to create tickets for?**
   
   **Recommendations:**
   - ✅ Create tickets for ALL Critical issues (strongly recommended)
   - ❓ Create tickets for selected Important issues (your choice based on timeline)  
   - ❓ Create tickets for Optional issues (only if time permits)

2. **Your Decision:**
   Review the prioritized list above and answer:
   - Do you want to ticket all Critical issues? (Y/N)
   - Which Important issues deserve tickets? (list specific ones)
   - Any Optional issues you want to address? (list if any)

3. **Create tickets based on your selection:**
```bash
# For your selected issues only:
ait3 ticket create "Fix security vulnerability: [specific issue you chose]"
ait3 ticket create "Optimize performance: [specific bottleneck you selected]"
ait3 ticket create "Refactor code: [specific improvement you want]"

# Optional: Document review completion
git add .
git commit -m "review(#TICKET): completed multi-agent code review

Selected findings documented as tickets for implementation"
```

**Key Question: What would you like to focus on first?**

## Quick Commands

For specific review types:
```bash
# Performance only
gemini -p "@src/ Review this code for performance bottlenecks"

# Security only  
# In Claude: "Review this code for security vulnerabilities"

# Architecture review
gemini -p "@src/ @docs/ Is this architecture scalable and maintainable?"
```

## Tips
- Run reviews after GREEN phase, before REFACTOR
- Document conflicting opinions in commit messages
- Keep context focused on specific changes
- Use ticket scope to limit review scope
