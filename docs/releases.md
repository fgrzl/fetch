# Release Guide

This document explains how to create releases for the `@fgrzl/fetch` library.

## 🚀 Standard Release Process

### Overview
Our release process uses **GitVersion** for automatic semantic versioning based on commit history:
1. **Develop** branch for active development  
2. **Main** branch for production releases
3. **GitVersion** automatically calculates version numbers from commit messages and git history
4. **Direct git flow** - no intermediate release branches

### Automated Release Workflow

#### Simple One-Click Release
The `Release` workflow automatically determines the next version using GitVersion:

1. Go to **Actions** → **Release** → **Run workflow**
2. Click **Run workflow** (no inputs required)

**GitVersion will automatically:**
- Analyze commit messages since last release
- Determine if it's a major, minor, or patch release
- Calculate the appropriate semantic version number

#### Hotfix Release
Use the `Hotfix Release` workflow for critical fixes:

1. Go to **Actions** → **Hotfix Release** → **Run workflow**
2. Enter the exact version (e.g., `1.2.1`)
3. Provide a description of the fix
4. Click **Run workflow**

### How GitVersion Determines Version Numbers

GitVersion analyzes your commit messages using conventional commits:

- **MAJOR** (breaking changes): Commits with `BREAKING CHANGE:` in footer or `!` after type
  - `feat!: remove deprecated API` → 1.0.0 → 2.0.0
  - `fix: something\n\nBREAKING CHANGE: changes behavior` → 1.0.0 → 2.0.0

- **MINOR** (new features): Commits starting with `feat:`
  - `feat: add new middleware` → 1.0.0 → 1.1.0
  - `feat(auth): support OAuth2` → 1.1.0 → 1.2.0

- **PATCH** (bug fixes): Commits starting with `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
  - `fix: handle timeout correctly` → 1.1.0 → 1.1.1
  - `docs: update API examples` → 1.1.1 → 1.1.2

### What the Release Workflow Does

#### ✅ **Quality Checks**
- Runs full test suite with coverage
- Runs linting and formatting checks
- Builds the project successfully

#### 🔄 **Simplified Git Flow**
1. Updates version in `package.json` on develop branch
2. Updates `CHANGELOG.md` with new version
3. Commits version bump to develop
4. Merges develop directly to `main`
5. Creates Git tag on main
6. Merges `main` back to `develop`

#### 📦 **GitHub Release**
- Creates GitHub release with auto-generated notes
- Includes bundle size information in release notes
- Attaches build artifacts (dist folder)
- NPM publishing handled by separate workflow

## 🛠 Manual Release Process (If Needed)

If the automated workflow fails, you can create a release manually:

### 1. Prepare Release

```bash
# Switch to develop and ensure it's up to date
git checkout develop
git pull origin develop

# Use GitVersion to determine next version (optional)
# Or manually decide based on changes

# Update version in package.json
npm version 1.2.3 --no-git-tag-version

# Update CHANGELOG.md manually
# Add entry for version 1.2.3

# Commit changes
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.2.3"
```

### 2. Quality Checks

```bash
# Run tests
npm run test:coverage

# Run linting
npm run lint:check

# Build project
npm run build
```

### 3. Merge and Tag

```bash
# Merge to main
git checkout main
git pull origin main
git merge --no-ff develop -m "Release v1.2.3"
git push origin main

# Create tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Merge back to develop
git checkout develop
git merge --no-ff main
git push origin develop
```

### 4. Create GitHub Release

```bash
# Create release with GitHub CLI
gh release create v1.2.3 \
  --title "Release v1.2.3" \
  --notes "Release notes here" \
  --latest \
  dist/**
```

## 📋 Release Checklist

Before creating a release:

- [ ] All tests passing on develop branch
- [ ] Documentation up to date
- [ ] Breaking changes documented in commit messages with `BREAKING CHANGE:` footer
- [ ] Feature commits use `feat:` prefix
- [ ] Bug fixes use `fix:` prefix
- [ ] All PRs merged to develop
- [ ] CI passing on develop
- [ ] Ready to merge develop to main

## 🏷 Commit Message Guidelines

To ensure GitVersion calculates versions correctly, follow [Conventional Commits](https://conventionalcommits.org/):

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Examples

**Features (Minor version bump):**
```bash
feat: add CSRF middleware support
feat(auth): implement OAuth2 flow
```

**Bug Fixes (Patch version bump):**
```bash
fix: handle network timeout correctly
fix(retry): exponential backoff calculation
```

**Breaking Changes (Major version bump):**
```bash
feat!: remove deprecated authentication method

BREAKING CHANGE: The `auth()` method has been removed. Use `useAuthentication()` instead.
```

**Other (Patch version bump):**
```bash
docs: update middleware examples
style: format code with prettier
refactor: simplify error handling
test: add edge case coverage
chore: update dependencies
```

### Version Guidelines

GitVersion will automatically determine:
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
  - API changes that break existing code
  - Removing features
  - Changing default behavior
  
- **MINOR** (1.0.0 → 1.1.0): New features
  - Adding new middleware
  - New configuration options
  - Enhanced functionality (backward compatible)
  
- **PATCH** (1.0.0 → 1.0.1): Bug fixes & maintenance
  - Security fixes
  - Bug fixes
  - Performance improvements
  - Documentation updates
  - Code style changes

## 🔧 Required Secrets

Make sure these are configured in GitHub repository secrets:

- `GITHUB_TOKEN` - Automatically provided by GitHub (for releases)
- `NPM_TOKEN` - NPM authentication token (for separate publishing workflow)

### Setting up NPM Token

1. Go to npmjs.com → Access Tokens
2. Generate a new "Automation" token
3. Add it as `NPM_TOKEN` in GitHub repository secrets

## 📊 Release Metrics

Each release automatically includes:
- Bundle size information
- Test coverage stats
- Commit history since last release
- Installation instructions
- Full changelog link

## 🚨 Emergency Releases

For critical security or bug fixes:

1. Use the **Hotfix Release** workflow
2. Provide the specific version number
3. Follow the same quality checks
4. The workflow handles the git operations automatically

## 📞 Support

If you encounter issues with the release process:

1. Check the GitHub Actions logs
2. Verify all secrets are configured
3. Ensure branch protection rules allow the workflow
4. Contact the maintainer if needed
