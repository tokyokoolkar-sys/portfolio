# Portfolio brief

Agreed in the grilling session on 2026-11-04. This is the source of truth for scope and design. Change it here first, then in code.

## Who and what

- **Ataqah Ramadhan Widiyana Putra**, design engineer. Computer Science, graduating 2028.
- Headline: *"I design interfaces and build what runs behind them."*
- Audience: recruiters hiring interns from mid-2027.
- Location line: *Jakarta, Indonesia · Open to internships from mid-2027 · Remote or on-site.*
- Contact: `ataqah.ramadhan@gmail.com` (mailto + copy button), LinkedIn, GitHub. Add a CV button when a CV exists.
- English only. One page.

## Stack and hosting

- Astro, Tailwind CSS 4, TypeScript, GSAP (ScrollTrigger, SplitText, Flip), Lenis. DOM-first. A canvas is used only where it earns its place (the pixel-bite reveal).
- Public repo `tokyokoolkar-sys/portfolio` deploys to Vercel at `ataqah.vercel.app`, falling back to `ataqahramadhan.vercel.app`.
- Vercel Web Analytics (cookieless). Swiss-style social preview card.
- Ask the user before creating the remote repo or pushing.

## Design

- **Concept:** a Swiss poster shot as one cinematic take. Slow scroll, full-bleed type and image reveals. Everything connects and nothing hard-cuts.
- **Palette (light theme first):** cream `#F2EDE4`, ink `#111111`, safety orange `#FF4F00`.
- **Type:**

  | Role | Face |
  |---|---|
  | Main headline | Bodoni Moda Black (900), max optical size, display sizes only (≥ 48px) |
  | Secondary headline | Inter Tight Bold |
  | Body | Inter Regular |
  | Dates and labels | Inter Tight Medium |
  | Giant numbers and text | Inter Tight ExtraBold |
  | Terminal replays only | JetBrains Mono |

- **Motif:** the square, or pixel. A persistent orange block carries the shot from scene to scene. The camera pushes into a letter exactly once.
- **Motion:** maximal, within these guardrails:
  1. Preloader ≤ 1s. Name and role readable on the first frame.
  2. A fixed index bar (Work / About / Contact) jumps the camera.
  3. Phones get a lighter take: fewer pinned scenes, native scroll, no Lenis smoothing.
  4. `prefers-reduced-motion` gets a static Swiss poster layout with the same content.
  5. Lighthouse mobile performance ≥ 90.

## Scenes (one take)

1. **Title.** Cream page. ATAQAH sits in giant orange Bodoni behind the cut-out portrait, which is pinned bottom-right on desktop so the photo's cropped edges stay hidden. The portrait arrives with the **pixel-bite reveal**. It starts about 8 pixels across, quantised to the palette, then halves the pixel size level by level (8 → 16 → 32 → 64 → 128 → photo). Within each level, random clusters of tiles snap to the next resolution a few at a time. Each step is a hard cut. The reveal takes about 1s and plays once. Reduced motion shows the sharp image. A label row reads *Ataqah Ramadhan · Design engineer* plus the location line.
2. **The dive.** One continuous camera push with no fills, cuts or fades. The name and the portrait move together as one stage, and the label cluster stays where it is. The camera pushes into the thickest point of an A's stroke until the orange ink fills the frame. On wide screens it uses the middle A; on tall screens, where the portrait covers it, the first A.
3. **Intro.** The headline sits on the orange field. The field then shrinks into **the block**, which persists from here on.
4. **Work 01–04.** The block becomes each project's frame, with giant ExtraBold numbers.
   1. **HedgeHound.** Flagship. A muted looping video of the local 3D sky, with a poster frame.
   2. **agent-relay.** The user's own screen recording (`agent-relay-demo.mp4`) plus a bridge, worktree and agent diagram. Placeholder until the recording arrives.
   3. **Sokrates / SkillForge.** AI SAP Hackathon, team Choco Munchacho. Role, in the user's words: *the problems that got past my teammates and their AI tools: the app layer, the architecture, and the bugs nobody else could crack.* Live demo: https://sokrates-sigma.vercel.app
   4. **BacktestEngine.** A terminal replay of a real scorecard run. Open a PR on that repo to fix the stale README and PLAN.

   **Built (4 Nov 2026).** Wide screens: the block flies into the frame, the scene pins, and the four projects play through one frame with the numbers rolling 01 → 04. Then the block returns to its corner. Phones, reduced motion and no-JS get a stacked list.
   **Media status:**
   - HedgeHound uses its OG poster until the video is recorded.
   - agent-relay shows a six-step flow diagram until `agent-relay-demo.mp4` arrives.
   - SkillForge shows a flow diagram, because the live demo's backend is down. The "Live demo" link is hidden until it is back.
   - BacktestEngine replays a real run from 4 Nov 2026 (SYNUSDT, Dec 2025 to Jun 2026). The run needed a local fix: `run.py` reads `cache/klines.parquet`, but `data.py` writes `SYNUSDT-1m-klines.parquet`. Fold that fix into the planned PR.
5. **Research desk.** Marked "code private".
   - **solana-wallet-research:** a terminal replay of the MCP tools plus a calibration chart.
   - **EvenLighter:** labelled "in design". Covers the ADRs, threat model and audit-log design.
6. **Toolbox.** Design / Frontend / Systems.
7. **Contact.** The block becomes the email button. ATAQAH returns small in the footer as a bookend. Colophon.

## Copy

Short, confident, first person, no buzzwords, one sentence per idea. Each project gets a hook, the user's role, 2–3 concrete highlights with real numbers, the stack, and links. Claude drafts and the user edits.

## Assets

- Portrait: `raw/portrait-cutout.png` (1412×2507 RGBA). Body alpha is lifted to fully opaque. Soft hair edges are kept.
- Raw originals live in `raw/` and are git-ignored.
