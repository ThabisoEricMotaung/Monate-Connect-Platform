# Code Quality & CI/CD Setup

This project uses a comprehensive code quality workflow to maintain consistency and catch issues early.

## Components

### 1. **ESLint** (`.eslintrc.json`)
- Lints TypeScript and React code
- Enforces best practices and error detection
- Configured for Next.js 15 with TypeScript
- Rules:
  - No unused variables (unless prefixed with `_`)
  - Strict equality (`===` instead of `==`)
  - No `console.log` in production code (except `warn`, `error`)
  - Explicit return types for functions (warn)
  - No `any` types (warn)

### 2. **Prettier** (`.prettierrc.json`)
- Auto-formats code for consistency
- Settings:
  - 2-space indentation
  - 100-character line width
  - Single quotes
  - Trailing commas (ES5 compatible)
  - Arrow functions with parentheses

### 3. **Husky** + **lint-staged** (`.lintstagedrc.json`)
- Runs linters automatically before commits
- Only checks files being committed (fast!)
- Prevents bad code from entering the repository
- Automatically fixes fixable issues

### 4. **GitHub Actions** (`.github/workflows/lint-and-test.yml`)
- Runs on every push and pull request
- Steps:
  1. ESLint check (fails if warnings)
  2. Prettier format check
  3. TypeScript type check
  4. Unit tests (via Vitest)
  5. Next.js build verification
  6. Coverage report (optional)

---

## Installation

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize Husky
```bash
npx husky install
```

This will create `.husky/pre-commit` hook automatically.

### Step 3: Verify Setup
```bash
npm run lint          # Run ESLint
npm run format:check  # Check Prettier formatting
npm run typecheck     # Check TypeScript types
npm test              # Run tests
npm run build         # Build Next.js
```

---

## Usage

### Linting & Formatting

**Check for issues:**
```bash
npm run lint              # ESLint only
npm run format:check      # Prettier only
npm run typecheck         # TypeScript only
```

**Auto-fix issues:**
```bash
npm run lint:fix          # ESLint + Prettier fix
npm run format            # Prettier only
```

### Running Tests
```bash
npm test                  # Run all tests once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Pre-commit Workflow

When you commit code:
1. Husky intercepts the commit
2. lint-staged runs ESLint and Prettier on changed files only
3. If fixes are needed, they're applied automatically
4. The commit proceeds if everything passes

```bash
git add src/components/MyComponent.tsx
git commit -m "Add new component"
# ✓ ESLint checks
# ✓ Prettier formats
# ✓ Commit succeeds
```

### Bypassing Hooks (Not Recommended!)

```bash
git commit --no-verify  # Skip pre-commit hooks (use only if necessary)
```

---

## GitHub Actions CI

Every push and PR automatically runs:
- ESLint linting (0 warnings allowed)
- Prettier format verification
- TypeScript type checking
- Unit tests
- Production build verification

**Workflow results appear in:**
- PR checks section
- GitHub Actions tab
- Email notifications (if configured)

---

## Editor Integration

### VS Code

Install extensions:
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)

Add to `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.validate": ["javascript", "typescript", "typescriptreact"],
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

This will auto-format on save and show ESLint errors inline.

---

## Best Practices

### Naming Conventions
- Components: PascalCase (`TenderCard.tsx`)
- Files/functions: camelCase (`getTenderDetails.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES = 3`)
- React hooks: camelCase, prefix with `use` (`useCollectorMetrics()`)

### Code Style
- Use `const` by default, `let` when necessary, never `var`
- Explicit return types for functions:
  ```typescript
  function getTenders(): Promise<Tender[]> {
    // ...
  }
  ```
- Use meaningful variable names (avoid single letters except `i`, `x`, `y`)
- Keep functions small and focused

### TypeScript
- Enable strict mode (enforced)
- Avoid `any` types (use `unknown` if necessary)
- Use type aliases for complex types:
  ```typescript
  type TenderWithMetadata = Tender & { metadata: Record<string, unknown> }
  ```

### Testing
- Test critical paths (collectors, API routes, utilities)
- Use descriptive test names
- Aim for >80% coverage on critical code

---

## Troubleshooting

### Husky pre-commit fails
**Issue:** `npx husky install` didn't work
```bash
# Reinstall Husky
rm -rf .husky node_modules
npm install
npx husky install
```

### ESLint errors I disagree with
Edit `.eslintrc.json` and adjust the rule. Common overrides:
```json
"@typescript-eslint/no-explicit-any": "off",  // Allow any
"no-console": "off",  // Allow console.log
```

### Prettier conflicts with ESLint
They should work together, but if there's a conflict:
1. Update both configs to match
2. Run `npm run lint:fix` to reconcile

### GitHub Actions failing
Check the workflow logs:
1. Go to **Actions** tab
2. Click the failed workflow
3. Review logs to see which step failed
4. Fix locally and push again

---

## Performance Notes

- **lint-staged** only checks changed files → fast
- **GitHub Actions** runs in parallel → ~2-3 min per PR
- **Vitest** is much faster than Jest for watch mode
- TypeScript compilation is cached between runs

---

## Contributing

Before pushing:
1. Run `npm run lint:fix` to auto-fix issues
2. Run `npm test` to verify tests pass
3. Run `npm run build` to verify production build
4. Push to create a PR (GitHub Actions will double-check)

---

## References

- [ESLint Docs](https://eslint.org/)
- [Prettier Docs](https://prettier.io/)
- [Husky Docs](https://typicode.github.io/husky/)
- [lint-staged Docs](https://github.com/lint-staged/lint-staged)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
