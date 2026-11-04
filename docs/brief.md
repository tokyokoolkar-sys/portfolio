# Portfolio brief

Agreed in the grilling session on 2026-11-04. This is the source of truth for scope and design. Change it here first, then in code.

## Who and what

- **Ataqah Ramadhan Widiyana Putra**, design engineer building AI agents (the one title, used in the hero label and meta; matches LinkedIn). Computer Science, graduating 2028.
- Headline: *"I design interfaces and build what runs behind them."*
- Audience: recruiters hiring interns from mid-2027.
- Location line: *Jakarta, Indonesia · Open to internships from mid-2027 · Remote or on-site.*
- Contact: `ataqah.ramadhan@gmail.com` (mailto + copy button), LinkedIn (`linkedin.com/in/ataramadhan`), GitHub (`tokyokoolkar-sys`). Add a CV button when a CV exists.
- English only. One page.

## Stack and hosting

- Astro, Tailwind CSS 4, TypeScript, GSAP (ScrollTrigger, SplitText, Flip), Lenis. DOM-first. A canvas is used only where it earns its place (the pixel-bite reveal).
- Public repo `tokyokoolkar-sys/portfolio` deploys to Vercel at `ataqah.vercel.app`, falling back to `ataqahramadhan.vercel.app`.
- Vercel Web Analytics (cookieless). Swiss-style social preview card.
- Ask the user before creating the remote repo or pushing.

## Design

- **Concept:** a Swiss poster shot as one cinematic take. Slow scroll, full-bleed type and image reveals. Everything connects and nothing hard-cuts.
- **Palette (light theme first):** cream `#F2EDE4`, ink `#111111`, safety orange `#FF4F00` for fields and orange on ink, text orange `#E04400` for orange type on cream (3.6:1; `#FF4F00` is 2.8:1 there). The title ATAQAH warms from text orange to `#FF4F00` during the dive, so the A's ink matches the About field.
- **Type:**

  | Role | Face |
  |---|---|
  | Main headline | Bodoni Moda Black (900), optical size 12 (the display cut's hairlines vanish at giant sizes, worst on phones), display sizes only (≥ 48px) |
  | Secondary headline | Inter Tight Bold |
  | Body | Inter Regular |
  | Dates and labels | Inter Tight Medium |
  | Giant numbers and text | Inter Tight ExtraBold |
  | Terminal replays only | JetBrains Mono |

- **Motif:** the square, or pixel. An orange block carries the shot from scene to scene and is always doing a job: field, strip, frame, button. It never parks idle on screen. The camera pushes into a letter exactly once.
- **Motion:** maximal, within these guardrails:
  1. Preloader ≤ 1s. Name and role readable on the first frame.
  2. A fixed index bar (Work / About / Contact) jumps the camera.
  3. Phones get a lighter take: fewer pinned scenes, native scroll, no Lenis smoothing.
  4. `prefers-reduced-motion` gets a static Swiss poster layout with the same content.
  5. Lighthouse mobile performance ≥ 90.

## Scenes (one take)

1. **Title.** Cream page. ATAQAH sits in giant orange Bodoni behind the cut-out portrait, which is pinned bottom-right on desktop so the photo's cropped edges stay hidden. The portrait arrives with the **pixel-bite reveal**. It starts about 8 pixels across, quantised to the palette, then halves the pixel size level by level (8 → 16 → 32 → 64 → 128 → photo). Within each level, random clusters of tiles snap to the next resolution a few at a time. Each step is a hard cut. The reveal takes about 1s and plays once. Reduced motion shows the sharp image. A label row reads *Ataqah Ramadhan · Design engineer* plus the location line.
2. **The dive.** One continuous camera push with no fills, cuts or fades. The name and the portrait move together as one stage, and the label cluster stays where it is. The camera pushes into the thickest point of an A's stroke until the orange ink fills the frame. On wide screens it uses the middle A; on tall screens, where the portrait covers it, the first A.
3. **Intro.** The headline sits on the orange field. The field then squeezes into a full-width strip, and **the block** takes it over.
   About's content sits on the screen's vertical centre. Before the field moves, About's text leaves (headline lines up through their masks, label and body fade up), so nothing straddles the shrinking edge. Then the empty field squeezes, long and gentle (power2, about 1.2 screens of scroll on desktop).
   **Toolbox band (built 4 Nov 2026).** The strip is the Toolbox: label Toolbox, three rows of skills (Design, Frontend, Systems) in ink ExtraBold on orange, separated by small squares. The Toolbox section is tucked under About's last screen, so the band pins the moment the squeeze ends: no blank scroll, nothing rises with the page. Then the labels rise through masks like About's headline, and each row slides in from the side it travels from (Design and Systems from the right, Frontend from the left), easing to reading speed, only while you scroll. Wide screens then wipe the rows off and slowly fold the strip into the Work frame (about one screen of scroll). Phones unpin and let the band scroll on. Reduced motion and no JS get the same band as a static wrapped list. The skill list is a draft from shipped projects; the user edits it.
4. **Work 01–04.** Order since the 5 Nov 2026 recruiter review: SkillForge (the award), agent-relay, HedgeHound (design showcase), BacktestEngine (stays last: the crawl eats its terminal). The block becomes each project's frame, with giant ExtraBold numbers.
   1. **HedgeHound.** Flagship. A muted looping video of the local 3D sky, with a poster frame.
   2. **agent-relay.** The user's own screen recording (`agent-relay-demo.mp4`) plus a bridge, worktree and agent diagram. Placeholder until the recording arrives.
   3. **Sokrates / SkillForge.** AWS × SAP Agentic AI University Hackathon Indonesia 2026 (Sokrates Agentic AI Hackathon), 2nd place, Intelligent Manufacturing track, 224 teams (top 40 finalists), team Choco Munchacho. Measured: re-plans a disrupted shift in 4.8 s; in the demo plant, modelled late-delivery penalties fell from Rp 150.8M to Rp 3.85M. Code links the team repo, fadilaisy/Sokrates. Role, in the user's words: *the problems that got past my teammates and their AI tools: the app layer, the architecture, and the bugs nobody else could crack.* Live demo: https://sokrates-sigma.vercel.app
   4. **BacktestEngine.** A terminal replay of a real scorecard run. Open a PR on that repo to fix the stale README and PLAN.

   **Built (4 Nov 2026).** Wide screens: the skills strip folds onto the Work frame's rect and waits there as the block while Work scrolls up under it. Work is tucked under the Toolbox pin's last screen, so the label and 01 rise while the strip folds in. All four projects share one frame box, and the "Selected work" label and number column start level with the frame's top edge. The scene pins, and the four projects play through one frame with the numbers rolling 01 → 04. Then Work 04 crawls into Contact's ink (below). The block stays hidden from here and returns at Contact. Phones, reduced motion and no-JS get a stacked list.
   **Media status:**
   - HedgeHound uses its OG poster until the video is recorded.
   - agent-relay plays `public/video/agent-relay-demo.mp4` (the 4 Nov 2026 recording, muted, looping, played only in view). The recording is a whole desktop, so `relayCam.ts` runs a slow camera keyed to the video clock: it holds on the prompt, pans to the Agents panel while the agents run, and returns as the result lands, never showing the UI below 85% of its own size. Reduced motion and no JS: the full frame with controls.
   - SkillForge shows a flow diagram, because the live demo's backend is down. The "Live demo" link is hidden until it is back.
   - BacktestEngine replays a real run from 4 Nov 2026 (SYNUSDT, Dec 2025 to Jun 2026). The run needed a local fix: `run.py` reads `cache/klines.parquet`, but `data.py` writes `SYNUSDT-1m-klines.parquet`. Fold that fix into the planned PR.
5. **The crawl into Contact** (built 4 Nov 2026, wide screens only). The Research desk was folded into one line under Work 04 on 4 Nov 2026 (critique): *Also on the research desk, code private: solana-wallet-research, in production, and EvenLighter, in design.* The last part of the Work pin (about 2.2 screens) crawls Work 04 away on one fixed canvas, driven only by scroll:
   - The screen pixelates, chunkier each step (8 → 16 → 32 → 64 → 128 → 256 → 512 px): the portrait's pixel bite run backwards. Each step is a hard cut in random clustered spots.
   - Black wins every block: a block holding anything black (the terminal, the giant 04, ink type) turns solid ink; only blocks with no black keep their averaged colour. Bigger blocks catch more black, so the ink takes the screen step by step until it is all ink.
   - The index bar turns cream once the ink reaches it, and stays cream over Contact.
   - Contact is tucked under the Work pin's last screen, so it reaches the top as the crawl ends, takes over from the ink and pins while its headline rises through masks.
   Section labels carry no numbers (About, Toolbox, Selected work, Contact); only the projects are numbered.
6. **Contact.** The block becomes the email button. ATAQAH returns small in the footer as a bookend. Colophon.
   **Built (4 Nov 2026).** On ink. On wide screens the headline rises inside the pin; elsewhere as the section arrives. It pins (about 1.4 screens on desktop, 1 on phones) and the block comes back one last time: one orange pixel in the button's centre doubles in hard steps, a square up to the button's height and then wider, until it is the email button. The address rises into it, then Copy, LinkedIn, GitHub and the location line, and ATAQAH rises in orange Bodoni at the foot with the colophon. Copy shows only when the clipboard is available. Reduced motion and no JS show everything with the button already orange. Headline "Send me / the hard part." is draft copy.

## Copy

Short, confident, first person, no buzzwords, one sentence per idea. Each project gets a hook, the user's role, 2–3 concrete highlights with real numbers, the stack, and links. Claude drafts and the user edits.

## Assets

- Portrait: `raw/portrait-cutout.png` (1412×2507 RGBA). Body alpha is lifted to fully opaque. Soft hair edges are kept.
- Raw originals live in `raw/` and are git-ignored.

## Recruiter review (5 Nov 2026)

- Intro shortened: dive pin 1.1 screens (was 1.6), About pin 1.8 (was 2.5) with a longer headline hold; About lands about 2 screens in.
- Social preview `public/og.png` (1200 × 630, rendered from the title scene) with og and twitter tags.
- Phones: the relay camera stays on the Agents panel; the terminal shows a narrow form without the +stop column.
- solana-wallet-research described as a research engine that never executes trades.
- No résumé yet: add a "Résumé (PDF)" link beside the email when one exists.
