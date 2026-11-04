/**
 * Geometry for the dive. The camera pushes into the thickest part of a glyph's
 * stroke, so the screen turns orange simply because the camera is inside the
 * letter. No fills, no cuts.
 *
 * The glyph is rendered to a canvas in the live font, which also gives an
 * exact ink test for working out how far the camera has to push.
 */

export type Point = readonly [number, number];

export interface Stroke {
  /** The deepest point inside the ink, in px relative to the glyph element's box. */
  point: Point;
  /** Whether a point (glyph-box px) is inside the ink. */
  isInk: (x: number, y: number) => boolean;
}

/** Layout offset of `el` inside a positioned `ancestor`, ignoring transforms. */
export function offsetWithin(el: HTMLElement, ancestor: HTMLElement): Point {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return [x, y];
}

export function measureStroke(glyph: HTMLElement): Stroke | null {
  const style = getComputedStyle(glyph);
  const fs = parseFloat(style.fontSize);
  const char = glyph.textContent?.trim() ?? "";
  if (!fs || !char) return null;

  // Render the glyph 400px tall-ish for precision. Canvas text has no
  // font-variation-settings; it takes its optical size from the font size
  // (automatic optical sizing). So set the font size to the DOM's opsz and
  // scale the canvas up to 400px: same shapes as the page, full resolution.
  const opsz = Number(/"opsz"\s+([\d.]+)/.exec(style.fontVariationSettings)?.[1]) || Math.min(fs, 96);
  const k = 400 / fs;
  const up = 400 / opsz;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const font = `${style.fontWeight} ${opsz}px ${style.fontFamily}`;
  ctx.font = font;
  const m = ctx.measureText(char);
  const ascent = m.fontBoundingBoxAscent * up;
  const descent = m.fontBoundingBoxDescent * up;
  const pad = 80;
  canvas.width = Math.ceil(m.width * up + pad * 2);
  canvas.height = Math.ceil(ascent + descent + pad * 2);
  ctx.font = font;
  ctx.fillStyle = "#000";
  ctx.setTransform(up, 0, 0, up, pad, pad + ascent);
  ctx.fillText(char, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const { width: W, height: H } = canvas;
  const alpha = ctx.getImageData(0, 0, W, H).data;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) ink[i] = alpha[i * 4 + 3] >= 128 ? 1 : 0;

  // Chamfer distance transform: distance from each ink pixel to the nearest background.
  const dist = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) dist[i] = ink[i] ? 1e9 : 0;
  const D = 1;
  const DD = Math.SQRT2;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!ink[i]) continue;
      dist[i] = Math.min(dist[i], dist[i - 1] + D, dist[i - W] + D, dist[i - W - 1] + DD, dist[i - W + 1] + DD);
    }
  let best = 0;
  let bestI = -1;
  for (let y = H - 2; y > 0; y--)
    for (let x = W - 2; x > 0; x--) {
      const i = y * W + x;
      if (!ink[i]) continue;
      dist[i] = Math.min(dist[i], dist[i + 1] + D, dist[i + W] + D, dist[i + W + 1] + DD, dist[i + W - 1] + DD);
      if (dist[i] > best) {
        best = dist[i];
        bestI = i;
      }
    }
  if (bestI < 0) return null;

  // Canvas px ↔ glyph-box px. The line box is centred on ascent + descent
  // (CSS half-leading), so the baseline sits at:
  const lineHeight = glyph.offsetHeight;
  const baseline = (lineHeight - (ascent + descent) / k) / 2 + ascent / k;
  const toBox = (cx: number, cy: number): Point => [(cx - pad) / k, (cy - pad - ascent) / k + baseline];
  const isInk = (x: number, y: number) => {
    const cx = Math.round(x * k + pad);
    const cy = Math.round((y - baseline) * k + pad + ascent);
    return cx >= 0 && cy >= 0 && cx < W && cy < H && ink[cy * W + cx] === 1;
  };

  return { point: toBox(bestI % W, Math.floor(bestI / W)), isInk };
}

/**
 * The smallest scale, about `origin` (glyph-box px), at which the ink covers
 * a `w`×`h` screen centred on that origin.
 */
export function coverScale(stroke: Stroke, w: number, h: number): number {
  const [ox, oy] = stroke.point;
  // Sample the screen's edges, not just its corners: strokes are slanted.
  const samples: Point[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    samples.push([(t - 0.5) * w, -h / 2], [(t - 0.5) * w, h / 2], [-w / 2, (t - 0.5) * h], [w / 2, (t - 0.5) * h]);
  }
  const covers = (s: number) => samples.every(([sx, sy]) => stroke.isInk(ox + sx / s, oy + sy / s));
  let lo = 1;
  let hi = 2;
  while (!covers(hi) && hi < 1e4) hi *= 2;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
