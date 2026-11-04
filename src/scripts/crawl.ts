/**
 * The Work 04 → Contact crawl: black wins the pixels. Everything is a
 * function of `progress`, which the scroll drives; there is no clock, so
 * nothing moves while the page is still.
 *
 * The screen pixelates, chunkier each step (8 → 16 → 32 → 64 → 128 → 256 →
 * 512 px), like the portrait's pixel bite run backwards. Inside every block
 * black wins: a block that holds anything black (the terminal, the giant
 * number, ink type) turns solid ink, and only blocks with no black keep their
 * averaged colour. The bigger the blocks, the more of them catch some black,
 * so the ink takes the screen step by step until all of it is ink, for the
 * Contact scene to take over. Each step is a hard cut that lands in random
 * clustered spots, a few blocks at a time.
 *
 * Canvas can't read the DOM, so the screen comes from a rough redraw:
 * backgrounds as rects, small text as ink coverage, big type as real glyphs.
 * Cut into 8px blocks and up, the difference can't be seen. A second redraw,
 * in black and white, marks where the black is. The layer is drawn at one
 * pixel per 4px cell and scaled up with sharp edges.
 */

type Options = {
  /** Elements whose pixels make up the screen being crawled away. */
  scene: () => HTMLElement[];
  /** Called when the strip under the index bar turns to ink, or back. */
  onDark?: (dark: boolean) => void;
};

const CELL = 4; // px per cell of the canvas
const LEVELS = [8, 16, 32, 64, 128, 256, 512]; // block sizes, px
const SPAN = 0.12; // progress per level
const ALL = LEVELS.length * SPAN + 0.02; // past this, the whole screen is ink
const BAR = 64; // px: height of the index bar's strip, for its dark switch
const INK = [17, 17, 17];
const CREAM = "#f2ede4";

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Integer hash → [0, 1). No sin(): it bands on integer grids.
function hash(x: number, y: number, salt: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function parseColor(c: string): [number, number, number, number] | null {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
  if (!m) return null;
  return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
}

const isDark = (c: [number, number, number, number]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 0.3 * 255;

/* A rough redraw of the screen. In `mask` mode it draws in black and white
 * instead: black where the screen is black (dark backgrounds, dark type,
 * small dark text as solid bars), white everywhere else. */
function redraw(roots: HTMLElement[], w: number, h: number, mask: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const page = parseColor(getComputedStyle(document.documentElement).backgroundColor);
  ctx.fillStyle = mask ? "#fff" : page && page[3] > 0 ? `rgb(${page[0]},${page[1]},${page[2]})` : CREAM;
  ctx.fillRect(0, 0, w, h);
  const range = document.createRange();

  const paint = (el: Element, opacity: number) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const alpha = opacity * parseFloat(cs.opacity || "1");
    if (alpha < 0.02) return;
    // Screen-reader-only text sits in a 1px box; it isn't on screen.
    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) return;

    const bg = parseColor(cs.backgroundColor);
    if (bg && bg[3] > 0) {
      if (mask) {
        // Opaque enough to count: black if dark, otherwise it covers what's under it.
        if (alpha * bg[3] > 0.5) {
          ctx.fillStyle = isDark(bg) ? "#000" : "#fff";
          ctx.fillRect(r.left, r.top, r.width, r.height);
        }
      } else {
        ctx.globalAlpha = alpha * bg[3];
        ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
        ctx.fillRect(r.left, r.top, r.width, r.height);
      }
    }

    for (const node of el.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        paint(node as Element, alpha);
        continue;
      }
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
      const color = parseColor(cs.color);
      if (!color) continue;
      // The mask only marks black type; light type on black stays part of the black.
      if (mask && (!isDark(color) || alpha * color[3] < 0.5)) continue;
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 2 && r.height > 2);
      const size = parseFloat(cs.fontSize);
      ctx.fillStyle = mask ? "#000" : `rgb(${color[0]},${color[1]},${color[2]})`;
      if (rects.length === 1 && size >= 28) {
        // Big type: real glyphs, on the same baseline as the page.
        const r = rects[0];
        const text = node.textContent.trim();
        ctx.globalAlpha = mask ? 1 : alpha * color[3];
        ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
        const m = ctx.measureText(text);
        const asc = m.fontBoundingBoxAscent;
        const desc = m.fontBoundingBoxDescent;
        ctx.fillText(text, r.left, r.top + (r.height - (asc + desc)) / 2 + asc);
      } else {
        // Small text: the share of its line box that ink covers (solid in the mask).
        const coverage = parseInt(cs.fontWeight, 10) >= 600 ? 0.42 : 0.3;
        ctx.globalAlpha = mask ? 1 : alpha * color[3] * coverage;
        for (const r of rects) ctx.fillRect(r.left, r.top + r.height * 0.18, r.width, r.height * 0.64);
      }
    }
  };

  for (const root of roots) {
    let opacity = 1;
    for (let p = root.parentElement; p; p = p.parentElement) opacity *= parseFloat(getComputedStyle(p).opacity || "1");
    paint(root, opacity);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/* Box-averaged copies of the redraw at each block size. */
function averages(src: HTMLCanvasElement) {
  const out: { w: number; data: Uint8ClampedArray }[] = [];
  let prev: HTMLCanvasElement = src;
  let scale = 1;
  for (const size of LEVELS) {
    // Halve step by step so each level is a fair average, not a sample.
    while (scale < size) {
      const next = document.createElement("canvas");
      next.width = Math.max(1, Math.ceil(prev.width / 2));
      next.height = Math.max(1, Math.ceil(prev.height / 2));
      const g = next.getContext("2d")!;
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.drawImage(prev, 0, 0, next.width, next.height);
      prev = next;
      scale *= 2;
    }
    const g = prev.getContext("2d", { willReadFrequently: true })!;
    out.push({ w: prev.width, data: g.getImageData(0, 0, prev.width, prev.height).data });
  }
  return out;
}

type Level = {
  /** Blocks across. */
  bw: number;
  /** Block size in cells. */
  b: number;
  /** Per block: 1 if it holds any black. */
  black: Uint8Array;
  /** Per block: the progress at which it snaps to this level. */
  at: Float32Array;
  /** Per block: its averaged colour. */
  avg: { w: number; data: Uint8ClampedArray };
};

export function createCrawl(canvas: HTMLCanvasElement, opts: Options) {
  const ctx = canvas.getContext("2d")!;
  let gw = 0;
  let gh = 0;
  let image: ImageData | null = null;
  let levels: Level[] | null = null;
  let wasDark = false;

  // Everything static for one pass, built on the first frame that needs it.
  function build() {
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    gw = Math.ceil(w / CELL);
    gh = Math.ceil(h / CELL);
    canvas.width = gw;
    canvas.height = gh;
    image = ctx.createImageData(gw, gh);

    const roots = opts.scene();
    const avgs = averages(redraw(roots, w, h, false));

    // Which cells are black: the mask, averaged down to the cell grid.
    const small = document.createElement("canvas");
    small.width = gw;
    small.height = gh;
    const g = small.getContext("2d", { willReadFrequently: true })!;
    g.imageSmoothingEnabled = true;
    g.drawImage(redraw(roots, w, h, true), 0, 0, gw, gh);
    const m = g.getImageData(0, 0, gw, gh).data;
    const cellBlack = new Uint8Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) cellBlack[i] = m[i * 4] < 160 ? 1 : 0;

    levels = LEVELS.map((size, k) => {
      const b = size / CELL;
      const bw = Math.ceil(gw / b);
      const bh = Math.ceil(gh / b);
      const black = new Uint8Array(bw * bh);
      for (let y = 0; y < gh; y++) {
        const row = Math.floor(y / b) * bw;
        for (let x = 0; x < gw; x++) if (cellBlack[y * gw + x]) black[row + Math.floor(x / b)] = 1;
      }
      // Random clustered moments within this level's slice of progress.
      const at = new Float32Array(bw * bh);
      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          const spot = hash(Math.floor(bx / 3), Math.floor(by / 3), 41 + k);
          at[by * bw + bx] = SPAN * (k + 0.95 * (spot * 0.7 + hash(bx, by, 5 + k) * 0.3));
        }
      }
      return { bw, b, black, at, avg: avgs[k] };
    });
  }

  function setDark(dark: boolean) {
    if (dark === wasDark) return;
    wasDark = dark;
    opts.onDark?.(dark);
  }

  function draw(progress: number) {
    const p = clamp(progress);
    if (p <= 0) {
      setDark(false);
      canvas.style.visibility = "hidden";
      levels = null; // retake next time: the scene may have changed
      return;
    }
    if (!levels || !image) build();
    canvas.style.visibility = "visible";

    const all = p >= ALL;
    const out = image!.data;
    const lv = levels!;
    const barRows = Math.ceil(BAR / CELL);
    let barInk = 0;

    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const i = gy * gw + gx;
        const o = i * 4;

        // The coarsest level this cell's block has snapped to.
        let k = -1;
        let block = 0;
        if (all) k = lv.length;
        else {
          for (let n = 0; n < lv.length; n++) {
            const L = lv[n];
            const j = Math.floor(gy / L.b) * L.bw + Math.floor(gx / L.b);
            if (p < L.at[j]) break;
            k = n;
            block = j;
          }
        }

        if (k < 0) {
          out[o + 3] = 0; // not reached yet: the live page shows through
          continue;
        }
        if (k < lv.length && !lv[k].black[block]) {
          // No black in this block: its averaged colour.
          const L = lv[k];
          const j = (Math.floor(gy / L.b) * L.avg.w + Math.floor(gx / L.b)) * 4;
          out[o] = L.avg.data[j];
          out[o + 1] = L.avg.data[j + 1];
          out[o + 2] = L.avg.data[j + 2];
          out[o + 3] = 255;
          continue;
        }

        // Black won this block.
        out[o] = INK[0];
        out[o + 1] = INK[1];
        out[o + 2] = INK[2];
        out[o + 3] = 255;
        if (gy < barRows) barInk++;
      }
    }
    ctx.putImageData(image!, 0, 0);
    // The index bar turns cream once most of the strip under it is ink.
    setDark(barInk / (barRows * gw) > 0.5);
  }

  return {
    draw,
    /** Forget the redraw after a resize or refresh; the next frame rebuilds it. */
    invalidate() {
      image = null;
      levels = null;
    },
  };
}
