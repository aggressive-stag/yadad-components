/**
 * Run the gallery browser checks (gallery/check/*.ts) one after another.
 *
 *   pnpm check:gallery                  start the gallery, run every check
 *   pnpm check:gallery tabs-keyboard    run only the named check(s)
 *   pnpm check:gallery --list           print the check names and exit
 *
 * The gallery is served on its fixed port (5199, vite.gallery.config.ts). If
 * something already answers there it is used and left running; otherwise this
 * script starts vite and stops it, by PID, when it ends (also on a failure,
 * SIGINT or SIGTERM). One check, one browser, at a time. A failing check does
 * not stop the later ones; the exit code is non-zero if any failed.
 * Set PLAYWRIGHT_EXECUTABLE_PATH to pin the Chromium build.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkDir = path.join(root, "gallery", "check");
const url = process.env.GALLERY_URL ?? "http://localhost:5199/";
const CHECK_TIMEOUT_MS = 10 * 60_000;

const all = readdirSync(checkDir).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3)).sort();
const args = process.argv.slice(2);
if (args.includes("--list")) {
  console.log(all.join("\n"));
  process.exit(0);
}
const unknown = args.filter((a) => !all.includes(a));
if (unknown.length) {
  console.error(`unknown check(s): ${unknown.join(", ")}\nknown: ${all.join(", ")}`);
  process.exit(2);
}
const names = args.length ? args : all;

let server: ChildProcess | undefined;
let current: ChildProcess | undefined;

function stopAll(): void {
  for (const p of [current, server]) if (p?.pid !== undefined && p.exitCode === null) p.kill("SIGTERM");
}
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    stopAll();
    process.exit(130);
  });
}
process.on("exit", stopAll);

async function answers(): Promise<boolean> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

async function ensureGallery(): Promise<void> {
  if (await answers()) {
    console.log(`using the gallery already serving at ${url} (left running)`);
    return;
  }
  const port = new URL(url).port || "5199";
  const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
  server = spawn(process.execPath, [vite, "--config", "vite.gallery.config.ts", "--port", port, "--strictPort"], {
    cwd: root,
    stdio: "ignore",
  });
  console.log(`started the gallery (pid ${server.pid}) at ${url}`);
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw new Error(`the gallery exited with code ${server.exitCode}`);
    if (await answers()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`the gallery did not answer at ${url} within 90 s`);
}

function run(name: string): Promise<{ ok: boolean; ms: number; tail: string }> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let out = "";
    const child = spawn(process.execPath, [path.join(checkDir, `${name}.ts`)], {
      cwd: root,
      env: { ...process.env, GALLERY_URL: url },
    });
    current = child;
    const keep = (d: Buffer): void => {
      out = (out + d.toString()).slice(-4000);
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const timer = setTimeout(() => child.kill("SIGTERM"), CHECK_TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      current = undefined;
      resolve({ ok: code === 0, ms: Date.now() - t0, tail: out.trim().split("\n").slice(-12).join("\n") });
    });
  });
}

const failed: string[] = [];
try {
  await ensureGallery();
  for (const name of names) {
    const r = await run(name);
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${name}  (${(r.ms / 1000).toFixed(1)} s)`);
    if (!r.ok) {
      failed.push(name);
      console.log(r.tail.replace(/^/gm, "      "));
    }
  }
} finally {
  stopAll();
}
console.log(failed.length ? `\n${failed.length} of ${names.length} checks failed: ${failed.join(", ")}` : `\nall ${names.length} checks passed`);
process.exit(failed.length ? 1 : 0);
