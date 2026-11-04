/**
 * The agent-relay recording is a whole desktop, so a slow camera finds the
 * relay in it: it holds on the prompt, pans to the Agents panel while the
 * agents run, then comes back as the result lands. Keyed to the video's own
 * clock, transform only. Motion off (or no JS): the full frame with controls.
 */
type View = { x: number; y: number; s: number };
type Key = View & { t: number };

// x, y: the point to centre on, as a fraction of the video; s: zoom.
const PROMPT: View = { x: 0.48, y: 0.12, s: 2 };
const AGENTS: View = { x: 0.845, y: 0.1, s: 3 };
// Never show the recording's text below about 85% of its own size, so
// narrow frames (phones) zoom in harder.
const MIN_SCALE = 0.85;
const KEYS: Key[] = [
  { t: 0, ...PROMPT },
  { t: 5.5, ...PROMPT },
  { t: 7, ...AGENTS },
  { t: 16, ...AGENTS },
  { t: 17.6, ...PROMPT },
];

// Moving on screen: a strong ease-in-out.
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

function at(t: number): View {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].t <= t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  if (!b) return a;
  const p = ease(Math.min(1, (t - a.t) / (b.t - a.t)));
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s + (b.s - a.s) * p };
}

export type RelayCam = { setShown: (shown: boolean) => void };

/**
 * `managed`: the pinned Work take says when this frame is the one showing
 * (all four frames share one rect there, so an observer can't tell).
 * Otherwise an IntersectionObserver does. Each reveal starts the recording
 * from the prompt, so the camera's story reads in order.
 */
export function relayCam(root: HTMLElement, managed = false): RelayCam | undefined {
  const video = root.querySelector("video");
  const toggle = root.querySelector<HTMLButtonElement>(".vid-toggle");
  if (!video) return;
  const ratio = () => (video.videoHeight || 9) / (video.videoWidth || 16);

  video.controls = false;

  const frame = () => {
    const c = at(video.currentTime);
    const fw = root.clientWidth;
    const fh = root.clientHeight;
    if (!fw || !fh) return;
    // Zoom: the view's own, at least readable, and enough to fill a tall frame.
    const s = Math.max(c.s, (MIN_SCALE * (video.videoWidth || 2560)) / fw, fh / fw / ratio());
    const visW = 1 / s;
    const visH = fh / (fw * ratio() * s);
    const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max));
    const x = clamp(c.x - visW / 2, 1 - visW);
    const y = clamp(c.y - visH / 2, 1 - visH);
    video.style.transform = `scale(${s}) translate(${-x * 100}%, ${-y * 100}%)`;
  };

  let running = false;
  const loop = () => {
    frame();
    if (!running) return;
    if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(loop);
    else requestAnimationFrame(loop);
  };

  let shown = false;
  let userPaused = false;

  const play = () => {
    video.play().catch(() => {
      video.controls = true;
    });
    if (!running) {
      running = true;
      loop();
    }
  };
  const stop = () => {
    running = false;
    video.pause();
  };

  const setShown = (next: boolean) => {
    if (next === shown) return;
    shown = next;
    if (next) {
      video.currentTime = 0;
      frame();
      if (!userPaused) play();
    } else stop();
  };

  // Moving content longer than 5s needs a way to stop it (WCAG 2.2.2).
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      userPaused = !userPaused;
      toggle.textContent = userPaused ? "Play video" : "Pause video";
      if (userPaused) stop();
      else if (shown) play();
    });
  }

  if (!managed) new IntersectionObserver(([e]) => setShown(e.isIntersecting)).observe(root);

  frame();
  video.addEventListener("loadedmetadata", frame);
  new ResizeObserver(frame).observe(root);
  return { setShown };
}
