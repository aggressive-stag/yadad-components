import type { ErrorSummaryProps } from "@yadad/core";
import type { ReactNode } from "react";

/** Announced list of problems: each message with its fix hint. */
export function ErrorSummary({ id, errors }: ErrorSummaryProps): ReactNode {
  return (
    <div id={id} role="alert" data-yadad="error-summary" data-part="root">
      {errors.map((e) => (
        <p key={`${e.path} ${e.code}`} data-part="item" data-code={e.code}>
          <span data-part="message">{e.message}</span> <span data-part="hint">{e.hint}</span>
        </p>
      ))}
    </div>
  );
}
