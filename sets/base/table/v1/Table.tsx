import type { TableProps } from "@yadad/core";
import type { ReactNode } from "react";

const ariaSort = (sort: "asc" | "desc" | undefined) => (sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined);
const arrow = (sort: "asc" | "desc" | undefined) => (sort === "asc" ? "▲" : sort === "desc" ? "▼" : "");

/**
 * A semantic table. Sortable headers hold a button; the sorted one carries
 * aria-sort. Plain DOM for now; virtualization arrives with a later version.
 */
export function Table({ caption, columns, rows, onSort, empty }: TableProps<ReactNode>): ReactNode {
  return (
    <div data-yadad="table" data-part="root">
      <table data-part="table">
        <caption data-part="caption">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.id} id={c.headerId} scope="col" data-part="header" aria-sort={ariaSort(c.sort)}>
                {c.sortable ? (
                  <button type="button" data-part="sort" onClick={() => onSort(c.id)}>
                    {c.label}
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
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} data-part="empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} data-part="row">
                {row.cells.map((cell, i) => (
                  <td key={columns[i]?.id ?? i} data-part="cell">
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
