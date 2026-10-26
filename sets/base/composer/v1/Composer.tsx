import type { ReactNode } from "react";

/** A saved-filter chip: the exact markup the renderer draws for `view.filters` (table-renderer.tsx, RFC 0009 item 5) — a secondary Button carrying `pressed`. Hosts render the renderer's chips; tests and galleries render this so both families are styled and checked as one. */
export interface ChipProps {
  readonly label: string;
  readonly pressed: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}

export function Chip({ label, pressed, disabled, onPress }: ChipProps): ReactNode {
  return (
    <button type="button" data-yadad="button" data-part="root" data-variant="secondary" data-pressed={pressed ? "true" : undefined} disabled={disabled} aria-pressed={pressed} onClick={onPress}>
      {label}
    </button>
  );
}

/** The chip row: the nav the renderer draws for saved filters (`data-yadad-saved-filters`), wrappable so a full set folds at phone width instead of overflowing. */
export interface ChipRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

export function ChipRow({ label, children }: ChipRowProps): ReactNode {
  return (
    <nav aria-label={label} data-yadad="chip-row" data-part="root" data-yadad-saved-filters="">
      {children}
    </nav>
  );
}
