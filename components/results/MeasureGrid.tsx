import type { Tile } from "./rows";

/** Four equal tiles in a row from 640 px, two by two on phones. */
export function MeasureGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} data-testid="measure" className="flex flex-col gap-1 rounded-card bg-card p-4 shadow-card">
          <span className="text-xs text-secondary">{tile.label}</span>
          <span className="text-[19px] leading-snug font-semibold tabular-nums">{tile.value}</span>
          {tile.note && <span className="text-xs text-secondary">{tile.note}</span>}
        </div>
      ))}
    </div>
  );
}
