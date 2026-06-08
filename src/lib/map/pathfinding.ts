import type { MapPoint, MapRing } from "@/lib/map/types";

/**
 * Grid-based A* pathfinding over the projected (pixel-space) carpark.
 * Walkable cells are inside the floor/lobby and outside pillars and lots,
 * so routes follow the driving aisles instead of cutting through obstacles.
 */

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function ringBox(ring: MapRing): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function inBox(p: MapPoint, b: Box): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
}

function pointInRing(p: MapPoint, ring: MapRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const intersect =
      a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export type NavGrid = {
  cols: number;
  rows: number;
  cell: number;
  walkable: Uint8Array;
};

type RingWithBox = { ring: MapRing; box: Box };

/** Build an occupancy grid; a cell is walkable if its centre is on the floor and clear of obstacles. */
export function buildNavGrid(opts: {
  width: number;
  height: number;
  cell: number;
  insideRings: MapRing[];
  blockRings: MapRing[];
}): NavGrid {
  const { width, height, cell } = opts;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const walkable = new Uint8Array(cols * rows);

  const inside: RingWithBox[] = opts.insideRings.map((ring) => ({ ring, box: ringBox(ring) }));
  const blocks: RingWithBox[] = opts.blockRings.map((ring) => ({ ring, box: ringBox(ring) }));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const center: MapPoint = { x: c * cell + cell / 2, y: r * cell + cell / 2 };

      let onFloor = false;
      for (const { ring, box } of inside) {
        if (inBox(center, box) && pointInRing(center, ring)) {
          onFloor = true;
          break;
        }
      }
      if (!onFloor) continue;

      let blocked = false;
      for (const { ring, box } of blocks) {
        if (inBox(center, box) && pointInRing(center, ring)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) walkable[r * cols + c] = 1;
    }
  }

  return { cols, rows, cell, walkable };
}

function cellIndex(grid: NavGrid, c: number, r: number): number {
  return r * grid.cols + c;
}

function isWalkableCell(grid: NavGrid, c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return false;
  return grid.walkable[cellIndex(grid, c, r)] === 1;
}

function pxToCell(grid: NavGrid, p: MapPoint): { c: number; r: number } {
  return { c: Math.floor(p.x / grid.cell), r: Math.floor(p.y / grid.cell) };
}

function cellCenter(grid: NavGrid, c: number, r: number): MapPoint {
  return { x: c * grid.cell + grid.cell / 2, y: r * grid.cell + grid.cell / 2 };
}

/** Nearest walkable cell to a point, searched in expanding rings. */
function snapToWalkable(grid: NavGrid, p: MapPoint, maxRadius = 60): { c: number; r: number } | null {
  const { c, r } = pxToCell(grid, p);
  if (isWalkableCell(grid, c, r)) return { c, r };
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        if (isWalkableCell(grid, c + dc, r + dr)) return { c: c + dc, r: r + dr };
      }
    }
  }
  return null;
}

/** Minimal binary min-heap keyed by f-score. */
class MinHeap {
  private items: { idx: number; f: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(idx: number, f: number): void {
    const items = this.items;
    items.push({ idx, f });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent]!.f <= items[i]!.f) break;
      [items[parent], items[i]] = [items[i]!, items[parent]!];
      i = parent;
    }
  }

  pop(): number {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < items.length && items[l]!.f < items[smallest]!.f) smallest = l;
        if (r < items.length && items[r]!.f < items[smallest]!.f) smallest = r;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i]!, items[smallest]!];
        i = smallest;
      }
    }
    return top.idx;
  }
}

const SQRT2 = Math.SQRT2;

/** A* between two pixel points; returns smoothed waypoints, or null if unreachable. */
export function findGridPath(grid: NavGrid, start: MapPoint, end: MapPoint): MapPoint[] | null {
  const startCell = snapToWalkable(grid, start);
  const endCell = snapToWalkable(grid, end);
  if (!startCell || !endCell) return null;

  const { cols, rows } = grid;
  const total = cols * rows;
  const startIdx = cellIndex(grid, startCell.c, startCell.r);
  const endIdx = cellIndex(grid, endCell.c, endCell.r);

  const gScore = new Float64Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const heuristic = (c: number, r: number) =>
    Math.hypot(c - endCell.c, r - endCell.r) * grid.cell;

  const open = new MinHeap();
  gScore[startIdx] = 0;
  open.push(startIdx, heuristic(startCell.c, startCell.r));

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  let found = false;
  while (open.size > 0) {
    const current = open.pop();
    if (current === endIdx) {
      found = true;
      break;
    }
    if (closed[current]) continue;
    closed[current] = 1;

    const cc = current % cols;
    const cr = Math.floor(current / cols);

    for (const [dc, dr] of dirs) {
      const nc = cc + dc!;
      const nr = cr + dr!;
      if (!isWalkableCell(grid, nc, nr)) continue;
      // Prevent cutting across obstacle corners on diagonals.
      if (dc !== 0 && dr !== 0) {
        if (!isWalkableCell(grid, cc + dc!, cr) || !isWalkableCell(grid, cc, cr + dr!)) continue;
      }
      const nIdx = cellIndex(grid, nc, nr);
      if (closed[nIdx]) continue;
      const step = (dc !== 0 && dr !== 0 ? SQRT2 : 1) * grid.cell;
      const tentative = gScore[current]! + step;
      if (tentative < gScore[nIdx]!) {
        gScore[nIdx] = tentative;
        cameFrom[nIdx] = current;
        open.push(nIdx, tentative + heuristic(nc, nr));
      }
    }
  }

  if (!found) return null;

  const cellPath: MapPoint[] = [];
  let node = endIdx;
  while (node !== -1) {
    const c = node % cols;
    const r = Math.floor(node / cols);
    cellPath.push(cellCenter(grid, c, r));
    if (node === startIdx) break;
    node = cameFrom[node]!;
  }
  cellPath.reverse();

  // Anchor exact endpoints, then simplify with line-of-sight smoothing.
  cellPath[0] = start;
  cellPath[cellPath.length - 1] = cellCenter(grid, endCell.c, endCell.r);
  return smoothPath(grid, cellPath);
}

/** True if a straight segment stays on walkable cells the whole way. */
function segmentClear(grid: NavGrid, a: MapPoint, b: MapPoint): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / (grid.cell * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const { c, r } = pxToCell(grid, { x, y });
    if (!isWalkableCell(grid, c, r)) return false;
  }
  return true;
}

function smoothPath(grid: NavGrid, points: MapPoint[]): MapPoint[] {
  if (points.length <= 2) return points;
  const out: MapPoint[] = [points[0]!];
  let anchor = 0;
  for (let i = 2; i < points.length; i++) {
    if (!segmentClear(grid, points[anchor]!, points[i]!)) {
      out.push(points[i - 1]!);
      anchor = i - 1;
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}
