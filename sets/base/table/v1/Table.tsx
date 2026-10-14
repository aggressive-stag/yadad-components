import type { TableProps } from "@yadad/core";
import type { ReactNode } from "react";

const ariaSort = (sort: "asc" | "desc" | undefined) => (sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined);
const arrow = (sort: "asc" | "desc" | undefined) => (sort === "asc" ? "▲" : sort === "desc" ? "▼" : "");

/**
 * A semantic table. Sortable headers hold a button; the sorted one carries
 * aria-sort and a visually hidden status so the button names its direction.
 * Under a narrow container (see table.css) rows stack as cards, each cell
 * labelled by its column via data-label; explicit roles keep the table
 * semantics when the CSS display type is no longer table. Plain DOM for now; virtualization arrives with a later version.
 */
export function Table({ caption, columns, rows, onSort, empty }: TableProps<ReactNode>): ReactNode {
  return (
    <div data-yadad="table" data-part="root">
      <table data-part="table" role="table">
        <caption data-part="caption">{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map((c) => (
              <th key={c.id} id={c.headerId} scope="col" role="columnheader" data-part="header" aria-sort={ariaSort(c.sort)}>
                {c.sortable ? (
                  <button type="button" data-part="sort" onClick={() => onSort(c.id)}>
                    {c.label}
                    {c.sort ? <span data-part="sort-status">{`, sorted ${ariaSort(c.sort)}`}</span> : null}
                    <span data-part="sort-indicator" aria-hidden="true">
                      {arrow(c.sort)}
                    </span>
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.length === 0 ? (
            <tr role="row">
              <td colSpan={columns.length} role="cell" data-part="empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} role="row" data-yadad-row={row.id} data-part="row">
                {row.cells.map((cell, i) => (
                  <td key={columns[i]?.id ?? i} role="cell" data-label={columns[i]?.label} data-part="cell">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
