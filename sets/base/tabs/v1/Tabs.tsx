import type { TabsProps } from "@yadad/core";
import { useId } from "react";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * WAI-ARIA tabs with automatic activation: a roving tabindex, arrow keys
 * (wrapping), Home and End, and focus that follows the selection.
 */
export function Tabs({ label, tabs, selected, onSelect, panel }: TabsProps<ReactNode>): ReactNode {
  const base = useId();
  const tabId = (id: string) => `${base}-tab-${id}`;
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    const target = next === undefined ? undefined : tabs[next];
    if (!target) return;
    event.preventDefault();
    onSelect(target.id);
    document.getElementById(tabId(target.id))?.focus();
  };
  return (
    <div data-yadad="tabs" data-part="root">
      <div role="tablist" aria-label={label} data-part="list">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={tabId(t.id)}
            data-part="tab"
            aria-selected={t.id === selected}
            aria-controls={`${base}-panel`}
            tabIndex={t.id === selected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={tabId(selected)} tabIndex={0} data-part="panel">
        {panel}
      </div>
    </div>
  );
}
