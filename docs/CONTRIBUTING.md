# Contributing to LumenX

## Branch workflow

Work on **feature branches** and open pull requests into `main`. Avoid pushing directly to `main` (protected; requires approval).

### Naming

| Prefix | Use |
|--------|-----|
| `feature/<area>-<short-description>` | New functionality |
| `fix/<area>-<short-description>` | Bug fixes |
| `chore/<short-description>` | Tooling, docs, deps |

Examples: `feature/careers-document-uploads`, `fix/nexus-billing-calc`.

### Typical flow

```bash
git checkout main
git pull origin main
git checkout -b feature/my-change

# … edit, test …

git add -A
git commit -m "Short summary of why the change exists."
git push -u origin feature/my-change
gh pr create --title "…" --body "…"
```

### Before opening a PR

1. Run relevant tests (see module docs, e.g. `docs/CAREERS_PORTAL_RELEASE.md`).
2. Keep commits focused; one logical change per PR when possible.
3. Do not commit secrets (`.env`, keys, credentials).

### Review & merge

- CI must pass.
- At least one review (team policy).
- Squash or merge per repo settings; delete the branch after merge.

## Module-specific notes

- **Careers** (`apps/careers`): see [CAREERS_PORTAL_RELEASE.md](./CAREERS_PORTAL_RELEASE.md) for auth modes, API wiring, and test commands.
- **Backend** (`backend/`): run `npm test --workspace=backend` for route/domain tests.

## Commits

Write commit messages that explain **why**, not just what changed. One or two sentences is enough.
