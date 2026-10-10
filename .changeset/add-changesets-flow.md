---
"@yadad/components": patch
---

Add the changesets flow: `pnpm changeset` records a change, `pnpm changeset version` bumps the version and writes `CHANGELOG.md`. The changelog now covers every published version (backfilled from the git history), ships in the package, and the GitLab publish job skips while changesets are pending so a half-released state can never publish.
