/**
 * Gallery completeness smoke test: renders the actual gallery page in jsdom
 * and checks that every registry entry appears at least once, so a new
 * component can't be forgotten by the page. The page renders every entry
 * through baseRegistry (the same way a host would) and every element is
 * tagged data-yadad="<type>"; this test derives the expected set from the
 * registry itself rather than hard-coding it.
 */
import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { baseRegistry } from "./base.js";
import App from "../gallery/src/App.js";

/** Every registry entry the page must show: field, layout, and widget types. */
function registryEntryTypes(): readonly string[] {
  const { layout, widgets } = baseRegistry;
  const entryTypes: string[] = [];
  for (const type of Object.keys(baseRegistry.fields)) {
    entryTypes.push(type);
  }
  // Layout entries are keyed by component name, not type; the page tags each
  // element with the kebab-case name.
  const layoutNames = {
    FieldFrame: "field-frame",
    Section: "section",
    Button: "button",
    Table: "table",
    ErrorSummary: "error-summary",
    Tabs: "tabs",
    Panel: "panel",
  } as const;
  for (const name of Object.keys(layout)) {
    entryTypes.push(layoutNames[name as keyof typeof layoutNames]);
  }
  for (const name of Object.keys(widgets)) {
    entryTypes.push(name.toLowerCase());
  }
  return entryTypes;
}

describe("the gallery page", () => {
  it("renders every registry entry at least once", () => {
    const { container } = render(<App />);
    for (const type of registryEntryTypes()) {
      const elements = container.querySelectorAll(`[data-yadad="${type}"]`);
      expect(elements.length, `the page must render at least one data-yadad="${type}" element`).toBeGreaterThan(0);
    }
    cleanup();
  });

  it("exposes every listed state anchor once, with no duplicate ids", () => {
    const { container } = render(<App />);
    // The anchors are the contract the later cards' checks link to.
    const anchors = [
      "text-empty",
      "text-filled",
      "text-required",
      "text-invalid",
      "number-invalid",
      "select-filled",
      "date-filled",
      "field-frame-errors",
      "table-empty",
      "table-sort-asc",
      "tabs-many",
      "count-loading",
    ] as const;
    for (const id of anchors) {
      expect(document.getElementById(id), `the page must expose #${id}`).not.toBeNull();
    }
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.getAttribute("id")) as string[];
    const seen = new Set<string>();
    for (const id of ids) {
      expect(seen.has(id), `duplicate id in the gallery page: ${id}`).toBe(false);
      seen.add(id);
    }
    cleanup();
  });
});
