import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { pixelBite } from "./pixelBite";
import { coverScale, measureStroke, offsetWithin } from "./glyph";
import { createCrawl } from "./crawl";

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

/* ── Index bar: anchor links cut straight to the scene ──
 * A glide would fast-forward every pinned scene in between, so the take cuts
 * instead. data-jump on a pinned scene is how far into its pin to land, 0 to
 * 1: Work lands once its first picture is up, Contact on its finished state.
 * Phones keep a native smooth scroll. */
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector<HTMLElement>(a.getAttribute("href") ?? "");
    if (!target) return;
    e.preventDefault();
    if (!lenis) {
      target.scrollIntoView({ behavior: motion ? "smooth" : "auto" });
      return;
    }
    const pin = ScrollTrigger.getAll().find((st) => st.pin === target);
    const at = Number(target.dataset.jump ?? 0);
    const y = pin ? pin.start + (pin.end - pin.start) * at : target;
    lenis.scrollTo(y, { immediate: true, force: true });
  });
});

/* Scroll length of a pinned scene, in viewport heights. Phones get a shorter take. */
const pinLength = (desktop: number, phone: number) => () => `+=${window.innerHeight * (touch ? phone : desktop)}`;

/* ── Scene 01: Title ─────────────────────────────────────────────── */
function introTitle(chars: Element[]) {
  const img = $<HTMLImageElement>(".portrait-img");
  const canvas = $<HTMLCanvasElement>(".portrait-canvas");

  void pixelBite(img, canvas)
    .catch(() => undefined)
    .finally(() => {
      img.style.opacity = "1";
      canvas.remove();
    });

  // Name and role are readable on the first frame: the labels never hide.
  // Only the giant word rises, and settles inside ~0.8s.
  gsap.set(".title-word", { visibility: "visible" });
  gsap.from(chars, { yPercent: 105, duration: 0.6, ease: "expo.out", stagger: 0.04 });
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

  gsap
    .timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: pinLength(1.6, 1.1),
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
    .to(stage, { x: () => geo.dx, y: () => geo.dy, scale: () => geo.scale, ease: "power3.in", duration: 1 }, 0)
    // The name is set in the darker text orange (contrast on cream). Once the
    // A's ink fills the frame, a full-screen wash of the field's orange fades
    // in over it (opacity only), so the hand-off to About is one colour.
    .fromTo(".dive-wash", { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.05 }, 0.95);
}

/* The block's resting box in viewport px. Layout values, so the block's own
 * transforms (it flies around later) never feed back into the measurement. */
function blockHome() {
  const block = $(".stage-block");
  return { x: block.offsetLeft, y: block.offsetTop, w: block.offsetWidth, h: block.offsetHeight };
}

type Rect = { x: number; y: number; w: number; h: number };

/* The block transform that lays the block exactly over a viewport rect. */
function blockOver(r: Rect) {
  const home = blockHome();
  return { x: r.x - home.x, y: r.y - home.y, scaleX: r.w / home.w, scaleY: r.h / home.h };
}

/* Wide screens get the pinned Work take. Phones and narrow screens get a stacked list. */
const workStage = () => !touch && window.matchMedia("(min-width: 1024px) and (min-aspect-ratio: 4/5)").matches;

/* Where the Work frame sits once its scene is pinned (the section's top at the viewport's top). */
function workFrameRect(): Rect {
  const section = $("#work");
  const frame = $(".work-item .work-frame");
  const [x, y] = offsetWithin(frame, section);
  return { x, y, w: frame.offsetWidth, h: frame.offsetHeight };
}

/* Where the skills band sits once its section's top reaches the viewport's top. */
function bandRect(): Rect {
  const section = $("#toolbox");
  const band = $(".skills-band");
  const [x, y] = offsetWithin(band, section);
  return { x, y, w: band.offsetWidth, h: band.offsetHeight };
}

const SIGNAL = "rgb(255, 79, 0)";
const CLEAR = "rgba(255, 79, 0, 0)";

/* ── Scene 03: Intro → the strip ─────────────────────────────────
 * The headline rises while the orange field scrolls in. Then the scene pins
 * and About's text leaves, then the empty field squeezes into a full-width
 * strip: the skills band's rect. The block takes the orange over there and
 * the Toolbox scene starts at once.
 */
function setupIntro(target: () => Rect) {
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

  // The target rect, as an inset of the full-screen field.
  const blockInset = () => {
    const r = target();
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
        end: pinLength(2.5, 1.7),
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
    .to({}, { duration: 0.35 }) // hold: read the headline
    // About leaves before the field moves, so no text straddles the edge of the
    // shrinking orange. Lines exit up through the same masks they rose in by,
    // well past 100%: the line box (0.95) is tighter than the glyphs, so at
    // -105% the tail of the "g" still shows. immediateRender off: the entry timeline above owns their starting state.
    .fromTo(
      lines,
      { yPercent: 0 },
      { yPercent: -170, stagger: 0.06, duration: 0.35, ease: "power2.out", immediateRender: false },
    )
    .fromTo(
      [".intro-label", ".intro-body p"],
      { autoAlpha: 1, y: 0 },
      { autoAlpha: 0, y: -24, stagger: 0.04, duration: 0.3, ease: "power2.out", immediateRender: false },
      "<",
    )
    // A long, gentle squeeze of the empty field: power2 rather than power3, so
    // the middle of the move doesn't rush past in a few wheel ticks.
    .to(field, { clipPath: blockInset, ease: "power2.inOut", duration: 1 }, ">+0.05")
    .set(block, {
      autoAlpha: 1,
      x: () => blockOver(target()).x,
      y: () => blockOver(target()).y,
      scaleX: () => blockOver(target()).scaleX,
      scaleY: () => blockOver(target()).scaleY,
    })
    .set(field, { autoAlpha: 0 });
}

/* ── Between 03 and 04: the Toolbox band ─────────────────────────────
 * The section is tucked under About's last screen, so it reaches the top the
 * moment About's pin ends (About's text has already left). When it does
 * the band sits exactly under the block, so the band's own orange takes over
 * and the scene pins. The labels rise through masks like About's headline,
 * and each row slides in from the side it travels from: Design and Systems
 * from the right, Frontend from the left. Rows move only while you scroll,
 * easing out so they slow to reading speed, and each travels far enough to
 * show every item.
 * Wide screens: the rows then wipe off, the block takes the orange back and
 * slowly folds the strip into the Work frame, where it waits for Work.
 * Elsewhere: the pin ends and the band scrolls on with the page.
 */
function setupSkills(stage: boolean) {
  const section = $("#toolbox");
  const band = $(".skills-band");
  const block = $(".stage-block");
  const tracks = gsap.utils.toArray<HTMLElement>(".skills-track");
  const labels = SplitText.create([".skills-heading", ".skills-group"], { type: "lines", mask: "lines" }).lines;

  const leftward = (i: number) => i % 2 === 0;
  const fromX = (i: number) => (leftward(i) ? band.clientWidth : -tracks[i].offsetWidth);
  const toX = (i: number) => (leftward(i) ? Math.min(0, band.clientWidth - tracks[i].offsetWidth) : 0);

  // Tuck the band's section up over About's last screen, so it reaches the
  // top (and pins) the moment About's pin ends: About is empty by then, and
  // the strip never waits through a screen of blank scroll. Re-measured on
  // every refresh, while pins are reverted.
  const about = $("#about");
  const tuck = () => {
    section.style.marginTop = `${-about.offsetHeight}px`;
  };
  tuck();
  ScrollTrigger.addEventListener("refreshInit", tuck);

  // Until the swap, the block carries the orange and the band is just its text.
  gsap.set(band, { backgroundColor: CLEAR });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: stage ? pinLength(3.8, 0) : pinLength(2.4, 2),
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  tl.set(block, { autoAlpha: 0 }, 0.01).set(band, { backgroundColor: SIGNAL }, 0.01);
  tl.from(labels, { yPercent: 105, stagger: 0.1, duration: 0.5, ease: "power3.out" }, 0.05);
  tracks.forEach((t, i) =>
    tl.fromTo(t, { x: () => fromX(i) }, { x: () => toX(i), ease: "power1.out", duration: 1.8 }, 0.1 + i * 0.1),
  );

  if (!stage) {
    tl.to({}, { duration: 0.2 });
    return;
  }

  // The block takes the orange back and the band's contents wipe off it...
  const atBand = () => blockOver(bandRect());
  const atFrame = () => blockOver(workFrameRect());
  const out = tl.duration() + 0.15;
  tl.set(band, { backgroundColor: CLEAR }, out)
    .set(block, { autoAlpha: 1 }, out)
    .fromTo(
      band,
      { clipPath: "inset(0% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 100% 0%)", duration: 0.4, ease: "power2.out" },
      out,
    )
    // ...then the strip slowly folds into the Work frame.
    .fromTo(
      block,
      { x: () => atBand().x, y: () => atBand().y, scaleX: () => atBand().scaleX, scaleY: () => atBand().scaleY },
      {
        x: () => atFrame().x,
        y: () => atFrame().y,
        scaleX: () => atFrame().scaleX,
        scaleY: () => atFrame().scaleY,
        duration: 1.1,
        ease: "power2.inOut",
      },
      out + 0.3,
    )
    .to({}, { duration: 0.15 });
}

/* ── Scene 04: Work 01–04 ────────────────────────────────────────
 * Wide screens: the block already waits at the frame's rect (the skills strip
 * folded into it), so the page simply arrives around it. When the scene pins,
 * the frame's own surface takes over the orange. Four projects play through
 * that one frame: media wipes up through the orange, the copy swaps, and the
 * giant number rolls to the next. Then Work 04 crawls into Contact's ink. Phones get the stacked list with a simple wipe per frame.
 */
/* Screens of scroll for the four projects, and for the crawl after them. */
const WORK = 5.6;
const CRAWL = 2.2;

function setupWork(stage: boolean) {
  const section = $("#work");
  const block = $(".stage-block");
  const items = gsap.utils.toArray<HTMLElement>(".work-item");
  const pick = (el: HTMLElement, sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
  const media = items.map((i) => pick(i, ".work-media")[0]);

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

  // One surface only: the first item's. Every media layer paints above it.
  const surfaces = pick(items[0], ".work-frame-bg");
  const copies = items.map((i) => pick(i, ".work-copy > *"));
  const digits = items.map((i) => pick(i, ".work-digit"));
  const termLines = pick(section, ".term-line");

  gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(termLines, { autoAlpha: 0 });
  items.slice(1).forEach((_, k) => {
    gsap.set(copies[k + 1], { autoAlpha: 0, y: 30 });
    gsap.set(digits[k + 1], { yPercent: 120 });
  });

  let crawlDark = false;
  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: pinLength(WORK + CRAWL, 0),
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      // The crawl's ink only counts for the index bar while this scene is pinned.
      onToggle: (self) => darkBar("crawl", self.isActive && crawlDark),
    },
  });

  // Pinned: the frame's surface sits exactly under the waiting block, so swap them.
  tl.set(surfaces, { visibility: "visible" }, 0.01).set(block, { autoAlpha: 0 }, 0.01);

  items.forEach((_, i) => {
    tl.to(media[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6 }, i === 0 ? 0.1 : ">-0.15");
    if (media[i].classList.contains("work-media--terminal")) {
      // The replay types out as you scroll.
      tl.to(termLines, { autoAlpha: 1, duration: 0.01, stagger: 0.05, ease: "none" }, ">-0.2");
    }
    tl.to({}, { duration: 1.2 }); // hold: read it

    // The last project stays up: the crawl eats it.
    if (i === items.length - 1) return;
    const at = tl.duration();
    tl.to(media[i], { clipPath: "inset(0% 0% 100% 0%)", duration: 0.5 }, at);
    tl.to(copies[i], { autoAlpha: 0, y: -24, stagger: 0.02, duration: 0.3, ease: "power2.in" }, at)
      .to(digits[i], { yPercent: -120, stagger: 0.06, duration: 0.45, ease: "power3.in" }, at)
      .to(digits[i + 1], { yPercent: 0, stagger: 0.06, duration: 0.5, ease: "power3.out" }, at + 0.4)
      .to(copies[i + 1], { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.45, ease: "power3.out" }, at + 0.5);
  });

  // Work 04 crawls into Contact's ink: the screen pixelates chunkier
  // each step and black wins every block, until it is all ink (crawl.ts). Same
  // scroll per unit as the projects above, so the pin grows by the crawl's share.
  const canvas = $<HTMLCanvasElement>(".crawl-layer");
  const crawl = createCrawl(canvas, {
    scene: () => [$(".work-heading"), ...surfaces, items[items.length - 1]],
    onDark: (dark) => {
      crawlDark = dark;
      darkBar("crawl", dark && !!tl.scrollTrigger?.isActive);
    },
  });
  // Draw on the next frame, never inside the timeline's own render: GSAP writes
  // some tweens lazily, so mid-render the redraw would catch Work half-updated.
  const proxy = { p: 0 };
  let queued = false;
  const paint = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      crawl.draw(proxy.p);
    });
  };
  ScrollTrigger.addEventListener("refreshInit", crawl.invalidate);
  ScrollTrigger.addEventListener("refresh", () => {
    crawl.invalidate();
    paint();
  });
  tl.fromTo(proxy, { p: 0 }, { p: 1, ease: "none", duration: tl.duration() * (CRAWL / WORK), onUpdate: paint });
}

/* The index bar's text turns cream over ink. Two things can ask for it (the
 * crawl and the Contact scene), so it stays dark while either does. */
const darkFor = new Set<string>();
function darkBar(who: string, dark: boolean) {
  if (dark) darkFor.add(who);
  else darkFor.delete(who);
  document.querySelector(".index-bar")?.classList.toggle("is-dark", darkFor.size > 0);
}
function watchDark() {
  // Contact is on ink. A pinned section is measured by its pin wrapper, which
  // includes the pin's scroll.
  for (const id of ["contact"]) {
    const el = $(`#${id}`);
    const wrap = el.parentElement;
    ScrollTrigger.create({
      trigger: wrap?.classList.contains("pin-spacer") ? wrap : el,
      start: "top 60px",
      end: "bottom 60px",
      onToggle: (self) => darkBar(id, self.isActive),
    });
  }
}

/* ── Scene 05: Contact ──────────────────────────────────────────
 * On ink. Wide screens: the section is tucked under the Work pin's last
 * screen, so it reaches the top the moment the crawl ends on full ink. It
 * rises hidden, takes over from the crawl's matching ink, and its headline
 * rises inside the pin. Elsewhere it rises as the section scrolls in.
 * Then it pins and the block comes back one last time: a single orange pixel
 * in the button's centre that doubles in hard steps (a square up to the
 * button's height, then wider) until it is the email button. The address
 * rises into it, the links follow, and ATAQAH rises at the foot of the page.
 */
function setupContact(stage: boolean) {
  const button = $(".contact-email");
  const fill = $(".contact-email-fill");
  const lines = SplitText.create([".contact-label", ".contact-line"], { type: "lines", mask: "lines" }).lines;
  const address = SplitText.create(".contact-email-text", { type: "lines", mask: "lines" }).lines;
  const name = SplitText.create(".contact-name", { type: "chars", mask: "chars" }).chars;

  // Step i: the pixel is 8·2^i px, capped by the button's own size.
  const STEPS = 8;
  const inset = (i: number) => {
    const W = button.offsetWidth;
    const H = button.offsetHeight;
    const size = 8 * 2 ** i;
    const w = i >= STEPS ? W : Math.min(W, size);
    const h = i >= STEPS ? H : Math.min(H, size);
    const y = (H - h) / 2;
    const x = (W - w) / 2;
    return `inset(${y}px ${x}px ${y}px ${x}px)`;
  };

  gsap.set(fill, { clipPath: "inset(50% 50% 50% 50%)" });

  const section = $("#contact");
  if (stage) {
    const work = $("#work");
    const tuck = () => {
      section.style.marginTop = `${-work.offsetHeight}px`;
    };
    tuck();
    ScrollTrigger.addEventListener("refreshInit", tuck);
    gsap.set(section, { autoAlpha: 0 });
  } else {
    // The headline rises while the section scrolls in...
    gsap
      .timeline({ scrollTrigger: { trigger: section, start: "top 80%", end: "top top", scrub: true } })
      .from(lines, { yPercent: 105, stagger: 0.12, ease: "power3.out" }, 0.3);
  }

  // ...then the section pins, so the pixel grows where you can see it.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#contact",
      start: "top top",
      end: pinLength(stage ? 2 : 1.4, 1),
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  let at = 0.05;
  if (stage) {
    // Take over from the crawl's ink, then the headline rises inside the pin.
    tl.set(section, { autoAlpha: 1 }, 0.01)
      .set(".crawl-layer", { opacity: 0 }, 0.01)
      .from(lines, { yPercent: 105, stagger: 0.1, duration: 0.5, ease: "power3.out" }, 0.05);
    at = 0.6;
  }
  for (let i = 0; i <= STEPS; i++) tl.set(fill, { clipPath: () => inset(i) }, at + i * 0.1);
  tl.from(address, { yPercent: 105, duration: 0.25, ease: "power3.out" }, ">+0.05")
    .from(
      [".contact-copy", ".contact-links", ".contact-where"],
      { autoAlpha: 0, y: 16, stagger: 0.06, duration: 0.25, ease: "power2.out" },
      ">-0.1",
    )
    // The bookend: ATAQAH rises at the foot of the page.
    .from(name, { yPercent: 105, stagger: 0.05, duration: 0.35, ease: "power3.out" }, ">-0.05")
    .from(".contact-colophon", { autoAlpha: 0, duration: 0.3, ease: "power2.out" }, "<+0.1")
    .to({}, { duration: 0.15 });
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
  // Decide the Work layout first: the strip measures the frame it folds into.
  const stage = workStage();
  if (stage) $("#work").classList.add("is-stage");
  gsap.set(".stage-block", { transformOrigin: "0 0" });
  setupIntro(bandRect);
  setupSkills(stage);
  setupWork(stage);
  setupContact(stage);
  watchDark();
  ScrollTrigger.refresh();
}

if (motion) void boot();
else watchDark();
