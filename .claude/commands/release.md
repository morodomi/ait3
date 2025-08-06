# AIT³ Release Process Guide

This guide describes the simple release process for AIT³ following the Trunk-Based + Release Tag strategy. All releases are made directly from the main branch after ensuring stability.

## Prerequisites

Before starting a release:
- Ensure zero ESLint warnings: `npm run lint`
- Ensure type checking passes: `npm run type-check`
- Ensure successful build: `npm run build`
- Ensure all tests pass: `npm run test:ci`
- Ensure main branch is up to date: `git pull origin main`

## Release Workflow

### 1. Create Release Ticket
```bash
ait3 ticket create "Release v1.2.0 - <brief description>"
ait3 ticket start <ticket-id>
```

### 2. Update Version in package.json
```bash
# For patch release (1.1.0 → 1.1.1)
npm version patch

# For minor release (1.1.0 → 1.2.0)
npm version minor

# For major release (1.1.0 → 2.0.0)
npm version major
```

This command automatically:
- Updates version in package.json
- Creates a commit with message "1.2.0"
- Creates a git tag "v1.2.0"

### 3. Update CHANGELOG.md

Add a new section at the top following the format:

```markdown
## [1.2.0] - 2025-07-11

### Added
- Feature descriptions

### Changed
- Change descriptions

### Fixed
- Bug fix descriptions

### Removed
- Removed feature descriptions
```

### 4. Commit CHANGELOG
```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v1.2.0"
```

### 5. Push Changes and Tag
```bash
# Push commits and the new tag
git push origin main --follow-tags
```

### 6. Publish to npm
```bash
# Dry run first to verify package contents
npm publish --dry-run

# If everything looks good, publish
npm publish
```

### 7. Create GitHub Release
```bash
gh release create v1.2.0 \
  --title "v1.2.0: <Brief Title>" \
  --notes "## Highlights
- Key feature 1
- Key feature 2

See [CHANGELOG.md](CHANGELOG.md) for full details."
```

### 8. Complete Release Ticket
```bash
ait3 ticket complete <ticket-id>
```

## Example: Full Release Flow

```bash
# 1. Start release
ait3 ticket create "Release v1.2.0 - ESLint zero warnings achievement"
ait3 ticket start 107

# 2. Ensure clean state
npm run lint && npm run type-check && npm run build && npm run test:ci

# 3. Update version
npm version minor

# 4. Update CHANGELOG.md manually
# Edit file to add v1.2.0 section

# 5. Commit and push
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v1.2.0"
git push origin main --follow-tags

# 6. Publish to npm
npm publish --dry-run  # Verify first
npm publish

# 7. Create GitHub release
gh release create v1.2.0 \
  --title "v1.2.0: ESLint Zero Warnings" \
  --notes "## Highlights
- Achieved zero ESLint warnings via smart configuration
- Improved developer experience

See [CHANGELOG.md](CHANGELOG.md) for full details."

# 8. Complete ticket
ait3 ticket complete 107
```

## Important Notes

- **Always publish from main branch** - Never from feature branches
- **Verify tests pass** - 100% test pass rate is mandatory
- **Check package contents** - Use `npm publish --dry-run` first
- **Semantic versioning** - Follow MAJOR.MINOR.PATCH convention
- **CHANGELOG format** - Keep consistent with existing entries

## Rollback Process (if needed)

If a release has issues:

```bash
# 1. Unpublish from npm (within 72 hours)
npm unpublish @morodomi/ait3@1.2.0

# 2. Delete git tag
git tag -d v1.2.0
git push origin --delete v1.2.0

# 3. Delete GitHub release
gh release delete v1.2.0 --yes

# 4. Fix issues and re-release with new patch version
```

## Future Automation

Consider adding these improvements later:
- Automated CHANGELOG generation from conventional commits
- CI/CD pipeline for automated publishing on tag push
- Pre-release checks in GitHub Actions