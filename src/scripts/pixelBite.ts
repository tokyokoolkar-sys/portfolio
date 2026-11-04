/**
 * Pixel-bite reveal.
 *
 * The image starts as a handful of giant pixels quantised to the site palette.
 * Each level doubles the resolution (8 → 16 → 32 → 64 → 128 columns), and the
 * last one brings in the real photo. The whole image never sharpens at once:
 * within each level, clusters of cells snap to the next resolution a few at a
 * time, spreading out from random bite centres. Every step is a hard cut.
 */

type RGB = readonly [number, number, number];

const INK: RGB = [17, 17, 17];
const CREAM: RGB = [242, 237, 228];
const SIGNAL: RGB = [255, 79, 0];

export interface PixelBiteOptions {
  /** Column counts per level, coarse to fine. Each must double the previous one. */
  columns?: number[];
  /** How many of the leading levels use only the three palette colours. */
  paletteLevels?: number;
  /** Pause on the first, coarsest frame. */
  holdMs?: number;
  /** Delay between bites. */
  biteMs?: number;
  /** Bites per level transition. */
  bitesPerLevel?: number;
}

interface Level {
  cols: number;
  rows: number;
  /** Cell edge length in source-image pixels. */
  cell: number;
  canvas: HTMLCanvasElement;
  /** Alpha mask per cell: true where the cell has content. */
  filled: Uint8Array;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => requestAnimationFrame(() => resolve()), ms));

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  return ctx;
}

/** Downscale by repeated halving so every pixel is a fair average of its area. */
function downscale(src: CanvasImageSource, sw: number, sh: number, tw: number, th: number) {
  let cur: CanvasImageSource = src;
  let w = sw;
  let h = sh;
  while (w / 2 > tw && h / 2 > th) {
    const nw = Math.ceil(w / 2);
    const nh = Math.ceil(h / 2);
    const next = makeCanvas(nw, nh);
    const nctx = ctx2d(next);
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(cur, 0, 0, w, h, 0, 0, nw, nh);
    cur = next;
    w = nw;
    h = nh;
  }
  const out = makeCanvas(tw, th);
  const octx = ctx2d(out);
  octx.imageSmoothingQuality = "high";
  octx.drawImage(cur, 0, 0, w, h, 0, 0, tw, th);
  return out;
}

function nearestPaletteColour(r: number, g: number, b: number): RGB {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum < 0.3) return INK;
  if (lum > 0.72) return CREAM;
  return SIGNAL;
}

/** Hard-edge the alpha, optionally snap colours to the palette, and record which cells have content. */
function finishLevel(canvas: HTMLCanvasElement, usePalette: boolean): Uint8Array {
  const ctx = ctx2d(canvas);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const filled = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0, cell = 0; i < px.length; i += 4, cell++) {
    if (px[i + 3] < 128) {
      px[i + 3] = 0;
      continue;
    }
    px[i + 3] = 255;
    filled[cell] = 1;
    if (usePalette) {
      const [r, g, b] = nearestPaletteColour(px[i], px[i + 1], px[i + 2]);
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  }
  ctx.putImageData(data, 0, 0);
  return filled;
}

function buildLevels(img: ImageBitmap, columns: number[], paletteLevels: number): Level[] {
  const W = img.width;
  const H = img.height;
  const finest = columns[columns.length - 1];
  const halvings = 2 ** (columns.length - 1);
  // Round the finest row count up so every coarser level is an exact halving.
  const finestRows = Math.ceil(Math.ceil((H * finest) / W) / halvings) * halvings;
  const cellFine = W / finest;

  const fine = makeCanvas(finest, finestRows);
  ctx2d(fine).drawImage(downscale(img, W, H, finest, Math.round(H / cellFine)), 0, 0);

  const levels: Level[] = [];
  let canvas = fine;
  for (let k = columns.length - 1; k >= 0; k--) {
    const cols = columns[k];
    const rows = finestRows / 2 ** (columns.length - 1 - k);
    if (k < columns.length - 1) canvas = downscale(canvas, canvas.width, canvas.height, cols, rows);
    const snapshot = makeCanvas(cols, rows);
    ctx2d(snapshot).drawImage(canvas, 0, 0);
    const filled = finishLevel(snapshot, k < paletteLevels);
    levels.unshift({ cols, rows, cell: W / cols, canvas: snapshot, filled });
  }
  return levels;
}

/** Cells worth biting: those with content, grown by one cell so soft edges are included. */
function activeCells(level: Level, next: Level | undefined): number[] {
  const { cols, rows, filled } = level;
  const has = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false;
    if (filled[cy * cols + cx]) return true;
    if (!next) return false;
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) if (next.filled[(cy * 2 + dy) * next.cols + cx * 2 + dx]) return true;
    return false;
  };
  const out: number[] = [];
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++)
        for (let dx = -1; dx <= 1 && !near; dx++) near = has(cx + dx, cy + dy);
      if (near) out.push(cy * cols + cx);
    }
  return out;
}

/** Split cells into bite batches that grow outward from a few random centres. */
function biteOrder(cells: number[], cols: number, bites: number): number[][] {
  if (cells.length === 0) return [];
  const centres = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => {
    const c = cells[Math.floor(Math.random() * cells.length)];
    return [c % cols, Math.floor(c / cols)] as const;
  });
  const keyed = cells.map((c) => {
    const x = c % cols;
    const y = Math.floor(c / cols);
    let d = Infinity;
    for (const [cx, cy] of centres) d = Math.min(d, Math.hypot(x - cx, y - cy));
    return { c, k: d / cols + (Math.random() - 0.5) * 0.12 };
  });
  keyed.sort((a, b) => a.k - b.k);
  const size = Math.ceil(keyed.length / bites);
  return Array.from({ length: bites }, (_, i) => keyed.slice(i * size, (i + 1) * size).map((e) => e.c));
}

export async function pixelBite(
  imgEl: HTMLImageElement,
  canvas: HTMLCanvasElement,
  {
    columns = [8, 16, 32, 64, 128],
    paletteLevels = 2,
    holdMs = 160,
    biteMs = 60,
    bitesPerLevel = 3,
  }: PixelBiteOptions = {},
): Promise<void> {
  await imgEl.decode().catch(() => undefined);
  const rect = canvas.getBoundingClientRect();
  if (!imgEl.naturalWidth || rect.width === 0 || rect.height === 0) return;

  // Work from a bitmap: with srcset, naturalWidth is density-corrected and
  // does not match the real pixel grid that drawImage samples from.
  const img = await createImageBitmap(imgEl);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = ctx2d(canvas);
  const s = canvas.width / img.width; // display px per source px
  const H = img.height;

  const levels = buildLevels(img, columns, paletteLevels);

  const edge = (v: number) => Math.round(v * s);

  const drawLevelCell = (level: Level, cx: number, cy: number) => {
    const x0 = edge(cx * level.cell);
    const y0 = edge(cy * level.cell);
    const w = edge((cx + 1) * level.cell) - x0;
    const h = edge((cy + 1) * level.cell) - y0;
    ctx.clearRect(x0, y0, w, h);
    ctx.drawImage(level.canvas, cx, cy, 1, 1, x0, y0, w, h);
  };

  const drawPhotoRegion = (cell: number, cx: number, cy: number) => {
    const sx = cx * cell;
    const sy = cy * cell;
    const sh = Math.min(cell, H - sy);
    if (sh <= 0) return;
    const x0 = edge(sx);
    const y0 = edge(sy);
    const w = edge(sx + cell) - x0;
    const h = edge(sy + sh) - y0;
    ctx.clearRect(x0, y0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, cell, sh, x0, y0, w, h);
    ctx.imageSmoothingEnabled = false;
  };

  // First frame: the coarsest level, whole.
  ctx.imageSmoothingEnabled = false;
  const first = levels[0];
  for (let cy = 0; cy < first.rows; cy++) for (let cx = 0; cx < first.cols; cx++) drawLevelCell(first, cx, cy);
  canvas.style.opacity = "1";
  await wait(holdMs);

  for (let k = 0; k < levels.length; k++) {
    const level = levels[k];
    const next = levels[k + 1];
    const batches = biteOrder(activeCells(level, next), level.cols, bitesPerLevel);
    for (const batch of batches) {
      for (const c of batch) {
        const cx = c % level.cols;
        const cy = Math.floor(c / level.cols);
        if (next) {
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) drawLevelCell(next, cx * 2 + dx, cy * 2 + dy);
        } else {
          drawPhotoRegion(level.cell, cx, cy);
        }
      }
      await wait(biteMs);
    }
  }
  img.close();
}
