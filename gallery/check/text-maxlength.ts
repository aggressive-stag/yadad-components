/**
 * Real-browser check for a text field's maxLength (RFC 0008 item 13c): typing
 * past the limit stops at it, and a field with no limit takes the same input.
 *
 * Run from the repo root (gallery running on 5199):
 *   GALLERY_URL=http://localhost:5199/ node --experimental-strip-types gallery/check/text-maxlength.ts
 */
import { chromium } from "playwright-core";

const url = process.env.GALLERY_URL ?? "http://localhost:5199/";
const launch: { executablePath?: string } = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {};
const results: string[] = [];
const check = (name: string, ok: boolean, extra = ""): void => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " - " + extra : ""}`);
};

const browser = await chromium.launch(launch);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const limited = page.locator("#g-text-maxlength");
  check("the limited input carries maxlength=10", (await limited.getAttribute("maxlength")) === "10");
  await limited.click();
  await page.keyboard.type("abcdefghijklmnop");
  const typed = await limited.inputValue();
  check("typing 16 characters stops at the limit", typed === "abcdefghij", `value "${typed}"`);
  const plain = page.locator('[data-yadad="text"]:not(#g-text-maxlength)').first();
  check("an input without a limit has no maxlength attribute", !(await plain.evaluate((e) => e.hasAttribute("maxlength"))));
} finally {
  await browser.close();
}
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
