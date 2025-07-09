# AIT³ Development Methodology

**AIT³** (AI + Ticket + Test + Tool driven development) implements dialectical reasoning through Claude-Gemini collaboration for superior software engineering.

**Core Philosophy**: Claude proposes → Gemini challenges → Human decides  
**Workflow**: PLANNING → RED → GREEN → REFACTOR → SQUASH

## AIT³ Workflow Commands

```bash
# Ticket-based development flow
ait3 flow plan "feature-name"    # PLANNING: Dialectical analysis
ait3 flow red 001                # RED: Test-first development
ait3 flow green 001              # GREEN: Implementation
ait3 flow refactor 001           # REFACTOR: Optimization
ait3 flow squash 001             # SQUASH: Clean history
```

## Architecture Principles

- **Pure Functions**: All commands are `(args, services) => CLIResult`
- **Service Injection**: Use ServiceFactory, never import implementations directly
- **Test First**: RED phase before implementation
- **100% Pass Rate**: GREEN phase requirement
- **Local Tickets**: `.tickets/` directory with markdown files

## Dialectical Process

1. **Claude proposes** - Clear reasoning for approach
2. **Gemini challenges** - Alternative perspectives via `gemini -p`
3. **Human decides** - Final judgment based on context

## Testing Requirements

- **Test Isolation**: Use temp directories with unique hashes
- **100% Pass Rate**: Required for GREEN phase
- **Colocate Tests**: Unit tests next to implementation
- **No Test Code in Src**: Keep implementation pure

---

## AI Instructions

### Language
**日本語で返答する**

### Development Principles  
- **YAGNI**: 将来使うかもしれない機能は実装しない
- **DRY**: 重複コードは必ず関数化、モジュール化する
- **Simple**: 複雑な解決策より単純な解決策を優先
- **100% Tests**: GREEN phaseでの妥協なし

### AIT³ Methodology
1. **PLANNING**: Propose with clear reasoning, welcome challenges
2. **RED**: Write tests first, define behavior not implementation
3. **GREEN**: Minimal code for 100% pass, mock external deps
4. **REFACTOR**: Optimize while maintaining 100% coverage
5. **SQUASH**: Git suggestions for clean history

### Architecture Rules
- Commands: Pure functions `(args, services) => CLIResult`
- Services: Always use ServiceFactory, never import implementations
- Tests: Colocate with implementation, use temp directories
- Types: TypeScript strict mode, zero `any`

### Key Principles
- Test-first development with 100% pass rate requirement
- Dialectical reasoning for architectural decisions
- Clean code with service injection pattern
- Systematic refactoring with test safety net
- Git history optimization for clarity

### Refutation as Strength
- Counterarguments are treasures, not threats
- Failed refutations strengthen confidence
- Successful refutations prevent production bugs
- Human judgment remains supreme