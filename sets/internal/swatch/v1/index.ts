import { COLOR_PALETTE } from "@yadad/core";

/**
 * The vocabulary slot (0-7) of a `#RRGGBB` colour, or undefined for a colour
 * outside the palette (or none). The slot is the index into the engine's
 * `COLOR_PALETTE`; matching is case-insensitive on the author's hex. Shared by
 * every surface that paints an RFC 0008 colour hint, so they all draw the same
 * dot for the same colour.
 */
export function paletteSlot(color: string | undefined): number | undefined {
  if (color === undefined) return undefined;
  const hex = color.toLowerCase();
  const slot = COLOR_PALETTE.findIndex((entry) => entry.hex.toLowerCase() === hex);
  return slot === -1 ? undefined : slot;
}
