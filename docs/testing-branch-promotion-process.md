# Testing Branch Promotion Process

## Objective

Promote the full frontend code from `development` into protected branch `testing` using a pull request, without modifying the `development` branch itself.

## Why this process was needed

- `testing` is a protected branch, so direct push/force-push is not the right path.
- `origin/testing` was structurally behind `origin/development`.
- `origin/testing` also contained an invalid Windows path:
  - `.github/workflows /block-debug.yml`
- A normal local checkout/merge against raw `testing` is risky on Windows because of that path.

## What was verified first

The following checks were used:

```powershell
git status --short --branch
git branch -vv
git branch --all --no-color
git rev-list --left-right --count origin/testing...origin/development
git ls-tree --name-only origin/testing
git ls-tree --name-only origin/development
```

Key findings:

- `origin/development` contains the full frontend repository.
- `origin/testing` contains only `.github` and `README.md`.
- This means the promotion PR is necessarily a full branch sync, not a CI-only patch.

## Executed process

### 1. Remove temporary helper branches

Temporary branches from the abandoned CI-only attempt were deleted:

```powershell
git checkout development
git branch -D testing-ci-pr testing-ci-sync
```

### 2. Create a clean promotion branch from development

```powershell
git checkout -b testing-sync-from-development
```

Purpose:

- Start from the correct full-code source branch.
- Keep `development` unchanged.
- Prepare a PR-only integration branch for protected `testing`.

### 3. Merge testing history with `ours` strategy

```powershell
git merge -s ours origin/testing -m "Merge origin/testing into testing-sync branch preserving development tree"
```

Purpose:

- Record `origin/testing` as merged in history.
- Keep the working tree exactly as `development`.
- Avoid Windows path issues from the malformed workflow path on `testing`.

### 4. Verify branch shape and diff

```powershell
git status --short --branch
git log --oneline --decorate --graph -4
git rev-list --left-right --count origin/testing...HEAD
git diff --stat origin/testing..HEAD
```

Observed result:

- Active branch: `testing-sync-from-development`
- Merge commit created successfully
- Branch diff against `origin/testing` reflects promotion of the full frontend codebase

### 5. Push the PR branch

```powershell
git push -u origin testing-sync-from-development
```

## Pull request details

### Source branch

`testing-sync-from-development`

### Target branch

`testing`

### Suggested PR title

`Promote development branch into testing`

### Suggested PR description

```md
## Summary

This PR promotes the current `development` frontend codebase into protected branch `testing`.

## Why this is needed

- `testing` is currently far behind `development`
- `testing` does not contain the full frontend repository content
- `testing` also contains an invalid workflow path that is problematic on Windows:
  - `.github/workflows /block-debug.yml`

## What was done

- Created a promotion branch from `development`
- Merged `origin/testing` using `-s ours` to preserve merge history without changing the `development` tree
- Pushed the branch for PR-based merge into protected `testing`

## Notes

- No direct changes were made to `development`
- This PR should be treated as a branch promotion PR, not a small CI-only fix
```

## Important notes

- Do not open this as a PR from `development` directly if you want a documented merge-handling branch.
- Do not try to resolve this by cherry-picking only CI files if the goal is to move the full app into `testing`.
- If branch protection blocks merge after PR creation, the remaining action is administrative or policy-based, not a Git history problem.

## Final status from this run

- Temporary branch `testing-ci-pr` deleted
- Temporary branch `testing-ci-sync` deleted
- Promotion branch created and pushed:
  - `origin/testing-sync-from-development`
