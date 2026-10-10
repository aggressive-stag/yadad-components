/**
 * The gallery's fixture data, shaped exactly like the @yadad/testing contract
 * fixtures (the contract-kit entry is test-runner code and cannot be loaded
 * in a browser page, so the FieldSample/FieldSamples shapes are mirrored
 * here). Same field shapes and values as the kit's defaultSamples, with the
 * wider shapes this gallery adds: a select with many choices and a date with
 * min/max.
 */
import type { DocumentError, FieldDefinitions, FieldValueTypes, FieldType } from "@yadad/core";

/** A field definition and a value to drive it with, per field type. */
export interface FieldSample<K extends FieldType> {
  readonly field: FieldDefinitions[K];
  readonly value: FieldValueTypes[K];
}

export type FieldSamples = { readonly [K in FieldType]: FieldSample<K> };

/**
 * The contract fixture fields and values, extended where the gallery shows a
 * wider shape than the kit's default (select: many choices; date: min/max).
 */
export const samples: FieldSamples = {
  text: { field: { id: "name", type: "text", label: "Name", required: true }, value: "Ada" },
  number: { field: { id: "weight", type: "number", label: "Weight", min: 0, step: 2.5, unit: "kg" }, value: 102.5 },
  boolean: { field: { id: "warmup", type: "boolean", label: "Warm-up set" }, value: true },
  select: {
    field: {
      id: "exercise",
      type: "select",
      label: "Exercise",
      options: {
        source: "static",
        values: [
          "Squat",
          "Bench press",
          "Deadlift",
          "Overhead press",
          "Barbell row",
          "Pull-up",
          "Bicep curl",
          "Lateral raise",
          "Leg press",
          "Walking lunges",
          "Cable fly",
          "Plank",
        ],
      },
    },
    value: "Bench press",
  },
  date: { field: { id: "day", type: "date", label: "Day", min: "2026-01-01", max: "2026-12-31" }, value: "2026-10-04" },
};

/** The error shapes the contract kit drives components with. */
export const requiredError = (path: string): DocumentError => ({
  path,
  code: "required",
  message: "This value is required.",
  hint: "Enter a value.",
});

export const invalidError = (path: string, message: string): DocumentError => ({
  path,
  code: "invalid-value",
  message,
  hint: "Use one of the allowed values.",
});
