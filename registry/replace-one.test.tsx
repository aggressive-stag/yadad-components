// The README's "Replace one component" and "Import one component" examples,
// compiled and run (card 43): keep the two in step.
import { cleanup, render } from "@testing-library/react";
import type { ButtonProps, FieldInputProps, Registry } from "@yadad/core";
import type { ReactNode } from "react";
import { describeRegistryContract } from "@yadad/testing/contract-kit";
import { afterEach, describe, expect, it } from "vitest";
import { baseRegistry } from "./base.js";
// Import one component: the same registry entry from its own path. In a host
// this is "@yadad/components/button"; the repo resolves the source file.
import { Button as BaseButton } from "../sets/base/button/v1/index.js";

afterEach(cleanup);

// --- README: Replace one component -----------------------------------------
function MyTextInput({ inputId, value, onChange, invalid, describedBy, labelledBy }: FieldInputProps<"text">): ReactNode {
  return (
    <input
      id={inputId}
      data-mine="text"
      value={value ?? ""}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
    />
  );
}
function MyButton(props: ButtonProps): ReactNode {
  return <BaseButton {...props} />;
}

const registry: Registry<ReactNode> = {
  ...baseRegistry,
  fields: { ...baseRegistry.fields, text: { type: "text", Input: MyTextInput, Display: baseRegistry.fields.text.Display } },
  layout: { ...baseRegistry.layout, Button: MyButton },
};

const common = { inputId: "x", invalid: false, onChange: () => {} } as const;

describe("replacing one entry of baseRegistry", () => {
  it("shows the replacement and keeps the rest of the set", () => {
    const { Input: Text } = registry.fields.text;
    const { Input: Num } = registry.fields.number;
    const { container } = render(
      <>
        <Text {...common} field={{ id: "name", type: "text", label: "Name" }} value="Ada" />
        <Num {...common} field={{ id: "age", type: "number", label: "Age" }} value={36} />
        <registry.layout.Button label="Save" type="button" variant="primary" disabled={false} />
      </>,
    );
    expect(container.querySelector('[data-mine="text"]')).not.toBeNull();
    expect(container.querySelector('[data-yadad="text"]')).toBeNull();
    // the number field is still the set's
    expect(container.querySelector('[data-yadad="number"]')).not.toBeNull();
    // the replaced layout entry rendered (it wraps the set's button here)
    expect(container.querySelector('[data-yadad="button"]')).not.toBeNull();
  });

  it("leaves baseRegistry itself untouched", () => {
    expect(baseRegistry.fields.text.Input).not.toBe(MyTextInput);
    expect(registry.fields.number).toBe(baseRegistry.fields.number);
  });
});

// The README points here for checking a changed registry.
describeRegistryContract(registry);
