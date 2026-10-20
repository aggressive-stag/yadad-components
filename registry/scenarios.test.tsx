// The RFC 0007 action scenarios (press → act → announce → reload; confirm +
// Cancel; validated input; 403 refusal; stale-record conflict) driven through
// OUR registry — the engine's own action-scenarios.test.tsx runs them against
// mockRegistry; this file is the one line of host wiring that holds
// @yadad/components to the same bar. The kit never imports a renderer: mount
// receives the documents, the seeded adapter and OUR registry.
import { describeActionScenarios } from "@yadad/testing/contract-kit";
import { TableRenderer } from "@yadad/renderer";
import { baseRegistry } from "./base.js";

describeActionScenarios({
  registry: baseRegistry,
  mount: ({ entity, view, registry, adapter }) => (
    <TableRenderer entity={entity} view={view} registry={registry} dataSources={new Map([["default", adapter]])} />
  ),
});
