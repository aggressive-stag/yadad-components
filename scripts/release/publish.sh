#!/bin/sh
# Publishes @yadad/components to this GitLab project's npm registry when its
# version is not there yet. Runs in GitLab CI on main (see .gitlab-ci.yml).
set -eu

: "${CI_API_V4_URL:?run this in GitLab CI}"
: "${CI_PROJECT_ID:?run this in GitLab CI}"
: "${CI_JOB_TOKEN:?run this in GitLab CI}"
: "${CI_SERVER_URL:?run this in GitLab CI}"

# Publishing goes to the project-level endpoint; consumers read through the
# instance-level one (/api/v4/packages/npm/), which works because the group
# name matches the @yadad scope.
registry="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/npm/"
cat > "${HOME}/.npmrc" <<NPMRC
@yadad:registry=${registry}
${registry#https:}:_authToken=${CI_JOB_TOKEN}
NPMRC

name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")
if [ "${version}" = "0.0.0" ]; then
  echo "release: ${name} is unreleased (0.0.0). Bump the version to release. Nothing published."
  exit 0
fi
# Empty output means the package exists but not this version; E404 means the
# package does not exist yet. Anything else (auth, network) is a failure.
if found=$(npm view "${name}@${version}" version 2>/tmp/npm-view.err); then
  if [ -n "${found}" ]; then
    echo "release: ${name}@${version} is already published. Nothing to do."
    exit 0
  fi
elif ! grep -q E404 /tmp/npm-view.err; then
  cat /tmp/npm-view.err >&2
  exit 1
fi
echo "release: publishing ${name}@${version}"

# Until contract-v0 is published, @yadad/core and @yadad/testing are linked
# from ../yadad, as in the GitHub workflow.
git clone --depth 1 "${CI_SERVER_URL}/yadad/yadad.git" ../yadad
# The runner's helper container owns the checkout; this container runs as
# root, so git (run by `prepare`) would refuse it as "dubious ownership".
git config --global --add safe.directory "${CI_PROJECT_DIR}"
corepack enable
(cd ../yadad && pnpm install --frozen-lockfile)
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
# The checkout is a detached HEAD, which pnpm's branch check would reject.
pnpm publish --no-git-checks
