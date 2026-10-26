import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pager, TablePager } from "./Pager.js";

afterEach(cleanup);

const q = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;
const button = (label: string): HTMLButtonElement =>
  [...document.querySelectorAll<HTMLButtonElement>('[data-yadad="button"]')].find((b) => b.textContent === label)!;

describe("TablePager (layout.Pager, RFC 0008 item 11)", () => {
  it("renders the built-in's markup shape: labelled nav carrying data-yadad-pager, Previous/info/Next", () => {
    render(<TablePager label="Tasks pages" hasPrevious hasNext page={2} pageCount={5} onPrevious={() => {}} onNext={() => {}} />);
    const nav = q<HTMLElement>("[data-yadad-pager]");
    expect(nav.tagName).toBe("NAV");
    expect(nav.getAttribute("aria-label")).toBe("Tasks pages");
    expect(nav.textContent).toContain("Previous");
    expect(nav.textContent).toContain("Next");
    expect(q<HTMLElement>('[data-part="info"]').textContent).toBe("Page 2 of 5");
  });

  it("Previous is disabled and inert on the first page", () => {
    const onPrevious = vi.fn();
    render(<TablePager label="p" hasPrevious={false} hasNext page={1} pageCount={5} onPrevious={onPrevious} onNext={() => {}} />);
    expect(button("Previous").disabled).toBe(true);
    fireEvent.click(button("Previous"));
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("Next is disabled and inert on the last page", () => {
    const onNext = vi.fn();
    render(<TablePager label="p" hasPrevious hasNext={false} page={5} pageCount={5} onPrevious={() => {}} onNext={onNext} />);
    expect(button("Next").disabled).toBe(true);
    fireEvent.click(button("Next"));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("single page: both ends disabled, the middle still reads Page 1 of 1", () => {
    render(<TablePager label="p" hasPrevious={false} hasNext={false} page={1} pageCount={1} onPrevious={() => {}} onNext={() => {}} />);
    expect(button("Previous").disabled).toBe(true);
    expect(button("Next").disabled).toBe(true);
    expect(q<HTMLElement>('[data-part="info"]').textContent).toBe("Page 1 of 1");
  });

  it("both ends fire when the page sits in the middle", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(<TablePager label="p" hasPrevious hasNext page={3} pageCount={5} onPrevious={onPrevious} onNext={onNext} />);
    fireEvent.click(button("Previous"));
    fireEvent.click(button("Next"));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("the current page carries aria-current (the marker is never colour alone)", () => {
    render(<TablePager label="p" hasPrevious hasNext page={2} pageCount={5} onPrevious={() => {}} onNext={() => {}} />);
    expect(q<HTMLElement>('[data-part="info"]').getAttribute("aria-current")).toBe("true");
  });

  it("cursor mode (no pageCount) shows the renderer's 'Page N' text", () => {
    render(<TablePager label="p" hasPrevious hasNext page={4} onPrevious={() => {}} onNext={() => {}} />);
    expect(q<HTMLElement>('[data-part="info"]').textContent).toBe("Page 4");
  });
});

describe("Pager (cursor set, card 15e) keeps its contract", () => {
  it("First and Previous disabled without a previous page", () => {
    render(<Pager hasPrev={false} hasNext info="1–31 of 148" onPrev={() => {}} onNext={() => {}} />);
    expect(button("First").disabled).toBe(true);
    expect(button("Previous").disabled).toBe(true);
    expect(button("Next").disabled).toBe(false);
  });

  it("carries no data-yadad-pager: the registry selector stays the built-in/registry pair's", () => {
    render(<Pager hasPrev hasNext onPrev={() => {}} onNext={() => {}} />);
    expect(document.querySelector("[data-yadad-pager]")).toBeNull();
  });
});
