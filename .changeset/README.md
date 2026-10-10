# Changesets

Every change that users of `@yadad/components` can see adds a changeset (`pnpm changeset`) describing what changed: patch for fixes, minor for features while pre-1.0. Use `pnpm changeset --empty` for changes that touch no user-visible behavior.

To cut a release: `pnpm changeset version`, which bumps the version and writes `CHANGELOG.md`, then commit and push. The GitLab mirror publishes any version that is not in the registry yet, and skips publishing while changesets are pending. See [changesets](https://github.com/changesets/changesets).
