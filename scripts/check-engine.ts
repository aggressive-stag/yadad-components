/**
 * check:engine — keep @yadad/components' peer range honest.
 *
 * The component set declares which @yadad/core versions it works with in
 * peerDependencies. Pre-1.0, each new core minor (0.3 -> 0.4) falls OUTSIDE
 * a ^0.3.0 range, so until the range is widened, hosts installing the newest
 * engine get a peer-dependency conflict and have to force the install. The
 * engine publishes often, so this is a check, not memory.
 *
 * Modes:
 *
 *   pnpm check:engine
 *     Asks the registry for every published @yadad/core and @yadad/testing
 *     version, reports the newest, and verifies:
 *       1. peerDependencies["@yadad/core"] covers the newest core
 *       2. the newest @yadad/testing accepts the newest core (the kit
 *          declares the core it runs against; a testing release older than
 *          the newest core cannot run the kit against it)
 *     Exits non-zero if either fails.
 *
 *   pnpm check:engine --install
 *     The proof that justifies widening the range. Copies this repo to a
 *     temp dir, replaces the link:../yadad dev dependencies with the NEWEST
 *     PUBLISHED versions, and runs the full gate (pnpm test) there. The
 *     linked ../yadad source may differ from the published newest version,
 *     so a green `pnpm test` against the link is not enough — only this
 *     result justifies widening peerDependencies["@yadad/core"].
 *
 * The registry defaults to the GitLab npm registry where @yadad/* is
 * published; override with `--registry <url>` or npm_config_registry.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/**
 * The registry is not reachable from THIS network (LAN-internal registry,
 * public CI runners, offline dev box). A genuine registry/HTTP error is NOT
 * this — those still fail the check, because a bogus "versions" lookup would
 * otherwise look like an empty registry.
 */
class RegistryError extends Error {}

interface Semver {
  satisfies(version: string, range: string): boolean;
}

interface Args {
  install: boolean;
  registry: string;
}

const REGISTRY_DEFAULT = "https://gitlab.base-camp.dev/api/v4/packages/npm/";

function fail(message: string): never {
  console.error(`check:engine: FAIL — ${message}`);
  process.exit(1);
}

/** semver is a transitive dep of changesets; resolve its index.js from the pnpm store layout. */
async function loadSemver(): Promise<Semver | null> {
  const candidates = [path.join(repoRoot, "node_modules", "semver", "index.js")];
  const pnpmDir = path.join(repoRoot, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (entry.startsWith("semver@")) candidates.push(path.join(pnpmDir, entry, "node_modules", "semver", "index.js"));
    }
  }
  for (const c of candidates) {
    if (!existsSync(c)) continue;
    try {
      return (await import(pathToFileURL(c).href)) as Semver;
    } catch {}
  }
  return null;
}

function npmView(spec: string, registry: string): unknown {
  try {
    const out = execFileSync("npm", ["view", ...spec.split(" "), "--json", "--registry", registry], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(out);
  } catch (err) {
    // Distinguish "this registry cannot be reached from here" from a real
    // result. npm reports both as non-zero exits, but only the network case
    // may skip (the caller decides) — a genuine registry error is still a
    // failure.
    const stderr = String((err as { stderr?: unknown }).stderr ?? "");
    const net = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET|getaddrinfo|network/i.test(stderr);
    throw net ? new RegistryError(`${spec}: unreachable from this network (${stderr.split("\n").find((l) => /\bE[A-Z0-9]{3,}\b|getaddrinfo/.test(l)) ?? "network error"})`) : err;
  }
}

interface PackageManifest {
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/** Every published version of a package, oldest first. */
function npmVersions(name: string, registry: string): string[] {
  return npmView(`${name} versions`, registry) as string[];
}

function newest(versions: string[], name: string): string {
  const v = versions.at(-1);
  if (v === undefined) fail(`no published versions of ${name}`);
  return v;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { install: false, registry: process.env.npm_config_registry || REGISTRY_DEFAULT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--install") args.install = true;
    else if (argv[i] === "--registry") args.registry = argv[++i] ?? args.registry;
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("usage: pnpm check:engine [--install] [--registry <url>]");
      process.exit(0);
    }
  }
  return args;
}

/** Checks 1+2: the declared peer range and the newest testing kit cover the newest published core. */
async function checkRanges(registry: string, { satisfies }: Semver): Promise<boolean> {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as PackageManifest;
  const coreRange = pkg.peerDependencies?.["@yadad/core"];
  if (!coreRange) fail("package.json has no peerDependencies['@yadad/core']");

  const coreVersions = npmVersions("@yadad/core", registry);
  const testingVersions = npmVersions("@yadad/testing", registry);
  const newestCore = newest(coreVersions, "@yadad/core");
  const newestTesting = newest(testingVersions, "@yadad/testing");

  console.log(`check:engine: registry ${registry}`);
  console.log(`  @yadad/core published:    ${coreVersions.join(", ")}`);
  console.log(`  @yadad/testing published: ${testingVersions.join(", ")}`);
  console.log(`  peer range declared:      ${coreRange}`);
  console.log(`  newest core:              ${newestCore}`);

  let ok = true;
  if (!satisfies(newestCore, coreRange)) {
    ok = false;
    console.error(`  FAIL: newest core ${newestCore} is OUTSIDE the peer range '${coreRange}'.`);
    console.error(`        Prove compatibility with 'pnpm check:engine --install', then widen the range;`);
    console.error(`        or record why not in the card Report.`);
  } else {
    console.log(`  ok: peer range covers newest core ${newestCore}`);
  }

  const testingMeta = npmView(`@yadad/testing@${newestTesting}`, registry) as { dependencies?: Record<string, string> };
  const testingPins = testingMeta.dependencies?.["@yadad/core"];
  if (!testingPins || !satisfies(newestCore, testingPins)) {
    ok = false;
    console.error(`  FAIL: @yadad/testing@${newestTesting} depends on '@yadad/core ${testingPins ?? "<none>"}' — it cannot run the kit against core ${newestCore}.`);
    console.error(`        The engine needs to cut a newer @yadad/testing before components can prove themselves against ${newestCore}.`);
  } else {
    console.log(`  ok: @yadad/testing@${newestTesting} accepts core ${newestCore} (depends on '${testingPins}')`);
  }
  return ok;
}

/** Check 3 (--install): full gate against the newest published engine, in a temp copy. */
async function installProof(registry: string, newestCore: string, newestTesting: string, newestTheme: string): Promise<{ pass: boolean; note: string }> {
  const dir = path.join(tmpdir(), `yadad-engine-check-${Date.now()}`);
  console.log(`check:engine --install: temp copy at ${dir}`);
  cpSync(repoRoot, dir, {
    recursive: true,
    dereference: true,
    filter: (src) => path.basename(src) !== "node_modules",
  });
  try {
    // Rewrite the link:../yadad dev deps to the newest PUBLISHED versions in
    // every manifest of the workspace (root + gallery), so the install
    // resolves from the registry. The root keeps @yadad/theme (a published
    // dep, not part of the gate) — it only gets bumped, not deleted.
    const rewrite = (manifestPath: string): void => {
      const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
      const deps = pkg.devDependencies;
      if (!deps) return;
      if (deps["@yadad/core"]) deps["@yadad/core"] = `^${newestCore}`;
      if (deps["@yadad/testing"]) deps["@yadad/testing"] = `^${newestTesting}`;
      if (deps["@yadad/theme"]) deps["@yadad/theme"] = `^${newestTheme}`;
      // Any other linked engine package (e.g. @yadad/renderer, which the
      // action-scenario tests render with) must come from the registry too,
      // or the temp copy cannot resolve it and the gate fails for a reason
      // that says nothing about compatibility.
      for (const [name, spec] of Object.entries(deps)) {
        if (name.startsWith("@yadad/") && spec.startsWith("link:")) {
          deps[name] = `^${newest(npmVersions(name, registry), name)}`;
        }
      }
      // The `prepare` script runs `git config core.hooksPath .githooks`. In a
      // throwaway temp copy that is not a git repo, git config would target the
      // GLOBAL config and hijack hooks for every other repo, so neutralize it.
      if (pkg.scripts && pkg.scripts.prepare) pkg.scripts.prepare = "true";
      writeFileSync(manifestPath, JSON.stringify(pkg, null, 2) + "\n");
    };
    rewrite(path.join(dir, "package.json"));
    rewrite(path.join(dir, "gallery", "package.json"));
    rmSync(path.join(dir, "pnpm-lock.yaml"), { force: true }); // lockfile pins the link: resolution
    // The main repo resolves @yadad/* via link:../yadad, so it has no registry
    // hint. The temp copy must FETCH @yadad/* from the GitLab npm registry, so
    // scope just that org to it (everything else stays on the default registry).
    writeFileSync(
      path.join(dir, ".npmrc"),
      `@yadad:registry=${registry.replace(/\/$/, "")}\n`,
    );
    console.log(`  devDependencies now: @yadad/core@^${newestCore}, @yadad/testing@^${newestTesting} and every other @yadad/* at its newest (published, not link:)`);

    const install = spawnSync("pnpm", ["install", "--no-frozen-lockfile"], { cwd: dir, stdio: "inherit" });
    if (install.status !== 0) return { pass: false, note: "pnpm install failed against the published engine" };

    const gate = spawnSync("pnpm", ["test"], { cwd: dir, stdio: "inherit" });
    return {
      pass: gate.status === 0,
      note: gate.status === 0 ? "full gate passed against the published engine" : "full gate FAILED against the published engine",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const args = parseArgs(process.argv.slice(2));
const semver = await loadSemver();
if (!semver) fail("semver not resolvable from node_modules — run `pnpm install` first");

// The registry is LAN-internal. From a network that cannot reach it there is
// no way to answer "is the range stale?" — so skip LOUDLY and exit 0. The
// check is correct where it can run (homelab, self-hosted runners, dev boxes);
// skipping must not masquerade as passing, and it must not fail the build on
// every unrelated push. A reachable-but-stale range still exits 1.
const skip = (err: Error): never => {
  console.error(`check:engine: SKIP — cannot reach the engine registry ${args.registry} from this network.`);
  console.error(`  (${String(err.message).split("\n")[0]})`);
  console.error(`  No staleness verdict was produced. This is NOT a pass: run where the registry is reachable to get one.`);
  process.exit(0);
};

if (args.install) {
  let coreVersions: string[], testingVersions: string[], themeVersions: string[];
  try {
    coreVersions = npmVersions("@yadad/core", args.registry);
    testingVersions = npmVersions("@yadad/testing", args.registry);
    themeVersions = npmVersions("@yadad/theme", args.registry);
  } catch (err) {
    if (err instanceof RegistryError) skip(err);
    throw err;
  }
  const newestCore = newest(coreVersions, "@yadad/core");
  const newestTesting = newest(testingVersions, "@yadad/testing");
  const newestTheme = newest(themeVersions, "@yadad/theme");
  const { pass, note } = await installProof(args.registry, newestCore, newestTesting, newestTheme);
  console.log(
    pass
      ? `check:engine --install: PASS — ${note} (core ${newestCore}, testing ${newestTesting}). Widening the peer range is justified.`
      : `check:engine --install: FAIL — ${note} (core ${newestCore}, testing ${newestTesting}). Do NOT widen the peer range; record what failed.`,
  );
  process.exit(pass ? 0 : 1);
}

let ok: boolean;
try {
  ok = await checkRanges(args.registry, semver);
} catch (err) {
  if (err instanceof RegistryError) skip(err);
  throw err;
}
console.log(ok ? "check:engine: ok — peer range and testing kit are current." : "check:engine: range is stale.");
process.exit(ok ? 0 : 1);
