import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { pixelBite } from "./pixelBite";
import { coverScale, measureStroke, offsetWithin } from "./glyph";

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

declare global {
  interface Window {
    __introStarted?: boolean;
  }
}

const root = document.documentElement;
const motion = root.classList.contains("motion");
const touch = window.matchMedia("(pointer: coarse)").matches;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
};

/* ── Smooth scroll: desktop only, so phones keep native scrolling ── */
let lenis: Lenis | undefined;
if (motion && !touch) {
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ── Index bar: anchor links glide through the take ── */
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href") ?? "");
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target as HTMLElement, { duration: 1.8 });
    else target.scrollIntoView({ behavior: motion ? "smooth" : "auto" });
  });
});

/* Scroll length of a pinned scene, in viewport heights. Phones get a shorter take. */
const pinLength = (desktop: number, phone: number) => () => `+=${window.innerHeight * (touch ? phone : desktop)}`;

/* ── Scene 01: Title ─────────────────────────────────────────────── */
function introTitle(chars: Element[]) {
  const img = $<HTMLImageElement>(".portrait-img");
  const canvas = $<HTMLCanvasElement>(".portrait-canvas");
  const labels = gsap.utils.toArray<HTMLElement>(".title-label");

  void pixelBite(img, canvas)
    .catch(() => undefined)
    .finally(() => {
      img.style.opacity = "1";
      canvas.remove();
    });

  gsap.set(".title-word", { visibility: "visible" });
  gsap.set(labels, { y: 14 });
  gsap
    .timeline()
    .from(chars, { yPercent: 105, duration: 0.85, ease: "expo.out", stagger: 0.055 })
    .to(labels, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, 0.45);
}

/* ── Scene 02: The dive ──────────────────────────────────────────
 * One continuous camera push. The stage (name and portrait together) scales
 * about the thickest point of an A's stroke, which also slides to the centre
 * of the screen, until the orange ink fills the frame. The labels stay put.
 */
function setupDive(glyph: HTMLElement) {
  const section = $("#title");
  const stage = $(".title-stage");
  const geo = { dx: 0, dy: 0, scale: 1 };

  const layout = () => {
    const stroke = measureStroke(glyph);
    if (!stroke) return;
    const [gx, gy] = offsetWithin(glyph, stage);
    const ox = gx + stroke.point[0];
    const oy = gy + stroke.point[1];
    stage.style.transformOrigin = `${ox}px ${oy}px`;
    // Centre on the visible screen, but cover the whole section too: on phones
    // the section and the window can differ by the browser toolbar.
    const vw = section.clientWidth;
    const cy = window.innerHeight / 2;
    const halfH = Math.max(cy, section.clientHeight - cy, window.innerHeight - cy);
    geo.dx = vw / 2 - ox;
    geo.dy = cy - oy;
    // 20% margin: at ~25× zoom, sub-pixel differences between the canvas glyph and
    // the page glyph become visible slivers at the screen edges.
    geo.scale = coverScale(stroke, vw, halfH * 2) * 1.2;
  };

  layout();
  ScrollTrigger.addEventListener("refreshInit", layout);

  gsap.to(stage, {
    x: () => geo.dx,
    y: () => geo.dy,
    scale: () => geo.scale,
    ease: "power3.in",
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: pinLength(1.6, 1.1),
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

/* The block's resting box in viewport px. Layout values, so the block's own
 * transforms (it flies around later) never feed back into the measurement. */
function blockHome() {
  const block = $(".stage-block");
  return { x: block.offsetLeft, y: block.offsetTop, w: block.offsetWidth, h: block.offsetHeight };
}

/* ── Scene 03: Intro → the block ─────────────────────────────────
 * The headline rises while the orange field scrolls in. Then the scene pins
 * and the field contracts into the block, which takes over from there.
 */
function setupIntro() {
  const section = $("#about");
  const field = $(".intro-field");
  const block = $(".stage-block");
  const lines = SplitText.create(".intro-headline", { type: "lines", mask: "lines" }).lines;

  gsap
    .timeline({
      scrollTrigger: { trigger: section, start: "top 85%", end: "top top", scrub: true },
    })
    .from(lines, { yPercent: 105, stagger: 0.12, ease: "power3.out" }, 0.25)
    .from([".intro-label", ".intro-body p"], { autoAlpha: 0, y: 24, stagger: 0.08, ease: "power2.out" }, 0.55);

  // The block's resting place, as an inset of the full-screen field.
  const blockInset = () => {
    const r = blockHome();
    const w = field.clientWidth;
    const h = field.clientHeight;
    return `inset(${r.y}px ${w - r.x - r.w}px ${h - r.y - r.h}px ${r.x}px)`;
  };

  gsap.set(field, { clipPath: "inset(0px 0px 0px 0px)" });
  gsap
    .timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: pinLength(1.3, 0.9),
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
    .to({}, { duration: 0.3 }) // hold: read the headline
    .to(field, { clipPath: blockInset, ease: "power3.inOut", duration: 0.7 })
    .set(block, { autoAlpha: 1 })
    .set(field, { autoAlpha: 0 });
}

/* ── Scene 04: Work 01–04 ────────────────────────────────────────
 * Wide screens: the block flies into the project frame and becomes it. The
 * scene pins and four projects play through that one frame: media wipes up
 * through the orange, the copy swaps, and the giant number rolls to the next.
 * At the end the frame hands back to the block, which returns to its corner.
 * Phones and narrow screens get the stacked list with a simple wipe per frame.
 */
function setupWork() {
  const section = $("#work");
  const block = $(".stage-block");
  const items = gsap.utils.toArray<HTMLElement>(".work-item");
  const pick = (el: HTMLElement, sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
  const media = items.map((i) => pick(i, ".work-media")[0]);

  const stage = !touch && window.matchMedia("(min-width: 1024px) and (min-aspect-ratio: 4/5)").matches;
  if (!stage) {
    media.forEach((m) =>
      gsap.from(m, {
        clipPath: "inset(100% 0% 0% 0%)",
        duration: 1.1,
        ease: "expo.out",
        scrollTrigger: { trigger: m, start: "top 85%", once: true },
      }),
    );
    return;
  }

  section.classList.add("is-stage");
  const frame = pick(items[0], ".work-frame")[0];
  // One surface only: the first item's. Every media layer paints above it.
  const surfaces = pick(items[0], ".work-frame-bg");
  const copies = items.map((i) => pick(i, ".work-copy > *"));
  const digits = items.map((i) => pick(i, ".work-digit"));
  const termLines = pick(section, ".term-line");

  // Where the frame sits once the scene is pinned, as a transform of the block.
  const geo = { x: 0, y: 0, sx: 1, sy: 1 };
  const measure = () => {
    const [fx, fy] = offsetWithin(frame, section);
    const home = blockHome();
    geo.x = fx - home.x;
    geo.y = fy - home.y;
    geo.sx = frame.offsetWidth / home.w;
    geo.sy = frame.offsetHeight / home.h;
  };
  measure();
  ScrollTrigger.addEventListener("refreshInit", measure);

  gsap.set(block, { transformOrigin: "0 0" });
  gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(termLines, { autoAlpha: 0 });
  items.slice(1).forEach((_, k) => {
    gsap.set(copies[k + 1], { autoAlpha: 0, y: 30 });
    gsap.set(digits[k + 1], { yPercent: 120 });
  });

  // Approach: the block flies from its corner into the frame as the scene arrives.
  gsap
    .timeline({
      scrollTrigger: { trigger: section, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
    })
    .fromTo(
      block,
      { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      {
        x: () => geo.x,
        y: () => geo.y,
        scaleX: () => geo.sx,
        scaleY: () => geo.sy,
        ease: "power2.inOut",
        duration: 1,
        immediateRender: false,
      },
    )
    // Landed: the frame takes over the orange, so nothing doubles up.
    .set(surfaces, { visibility: "visible" })
    .set(block, { autoAlpha: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: pinLength(5.6, 0),
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  items.forEach((_, i) => {
    tl.to(media[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6 }, i === 0 ? 0.1 : ">-0.15");
    if (media[i].classList.contains("work-media--terminal")) {
      // The replay types out as you scroll.
      tl.to(termLines, { autoAlpha: 1, duration: 0.01, stagger: 0.05, ease: "none" }, ">-0.2");
    }
    tl.to({}, { duration: 1.2 }); // hold: read it

    const at = tl.duration();
    tl.to(media[i], { clipPath: "inset(0% 0% 100% 0%)", duration: 0.5 }, at);
    if (i === items.length - 1) return;
    tl.to(copies[i], { autoAlpha: 0, y: -24, stagger: 0.02, duration: 0.3, ease: "power2.in" }, at)
      .to(digits[i], { yPercent: -120, stagger: 0.06, duration: 0.45, ease: "power3.in" }, at)
      .to(digits[i + 1], { yPercent: 0, stagger: 0.06, duration: 0.5, ease: "power3.out" }, at + 0.4)
      .to(copies[i + 1], { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.45, ease: "power3.out" }, at + 0.5);
  });

  // Hand the frame back to the block, which returns to its corner.
  tl.set(block, { autoAlpha: 1 })
    .set(surfaces, { visibility: "hidden" })
    .to(block, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.9 });
}

/* ── Boot ────────────────────────────────────────────────────────── */
async function boot() {
  window.__introStarted = true;
  await document.fonts.ready;

  const split = SplitText.create(".title-word", { type: "chars", mask: "chars" });
  introTitle(split.chars);
  // Dive into an A the portrait doesn't cover: the middle one when the portrait
  // is pinned right, the first one when it fills the width on tall screens.
  const wide = window.matchMedia("(min-aspect-ratio: 4/5)").matches;
  setupDive(split.chars[wide ? 2 : 0] as HTMLElement);
  setupIntro();
  setupWork();
  ScrollTrigger.refresh();
}

if (motion) void boot();
