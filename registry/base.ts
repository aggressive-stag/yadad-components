import type { Registry } from "@yadad/core";
import type { ReactNode } from "react";
import { BooleanDisplay, BooleanInput } from "../sets/base/boolean/v1";
import { DateDisplay, DateInput } from "../sets/base/date/v1";
import { FieldFrame } from "../sets/base/field-frame/v1";
import { NumberDisplay, NumberInput } from "../sets/base/number/v1";
import { SelectDisplay, SelectInput } from "../sets/base/select/v1";
import { TextDisplay, TextInput } from "../sets/base/text/v1";

/**
 * The base set: one component version per field type. Switching a version is
 * a one-line change here. Hosts inject this into the yadad renderer.
 */
export const baseRegistry: Registry<ReactNode> = {
  fields: {
    text: { type: "text", Input: TextInput, Display: TextDisplay },
    number: { type: "number", Input: NumberInput, Display: NumberDisplay },
    boolean: { type: "boolean", Input: BooleanInput, Display: BooleanDisplay },
    select: { type: "select", Input: SelectInput, Display: SelectDisplay },
    date: { type: "date", Input: DateInput, Display: DateDisplay },
  },
  layout: { FieldFrame },
};
