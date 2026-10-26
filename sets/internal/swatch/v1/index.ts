/**
 * The documented colour vocabulary: the 8-hex palette RFC 0008 item 5 names as
 * its source (the todo app's list colours, F3-documents.md). A colour outside
 * this list paints no dot (card 23b Decision). Keys are lowercase; matching is
 * case-insensitive on the author's hex.
 */
const PALETTE_SLOTS: Readonly<Record<string, number>> = {
  "#464ea9": 0, // blue (indigo)
  "#d13438": 1, // red
  "#f7630c": 2, // orange
  "#ffb900": 3, // yellow
  "#107c10": 4, // green
  "#038387": 5, // teal
  "#8764b8": 6, // purple
  "#c239b3": 7, // pink
};

/**
 * The vocabulary slot (0-7) of a `#RRGGBB` colour, or undefined for a colour
 * outside the palette (or none). Shared by every surface that paints an
 * RFC 0008 colour hint, so they all draw the same dot for the same colour.
 */
export function paletteSlot(color: string | undefined): number | undefined {
  return color === undefined ? undefined : PALETTE_SLOTS[color.toLowerCase()];
}
