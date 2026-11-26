# 《鹈鹕测试》Shared Scene Style Specification (`STYLE_SPEC.md`)

## 1. Pure Function & Coordinate Contract
- Every scene exports a default pure function `render(ctx)` receiving `{ p, brush, g, kit, t, localTime, beat, meta }`.
- Never store animated frame state across frames. Everything must be a pure function of `t` / `localTime` (`u in [0, 6)`), supporting arbitrary seeking.
- **Canonical Composition Space**: `[0..1000] × [0..1000]`, with left/right portal bleed extending to `x in [-420, 1420]`.
- **Continuous Road & Portal Alignment**:
  - At `u <= 0` and `u >= 6`, the road surface MUST align with `ROAD_Y = 730` and the Pelican Rig scale MUST be `1.0` at `getScenePelicanX(u)`, so crossing the Portal Frame shows left/right halves locked seamlessly across art styles.
  - Internal camera zooms (e.g., `#05 Song Dynasty`) or pillarbox shutters (e.g., `#19 Short Video`) MUST ease cleanly into and out of `(zoom=1, ROAD_Y=730)` inside `u in [0.4, 5.5]`.

## 2. Beat & Performance Discipline
- **120 BPM / 60 fps**: `1 beat = 0.5s`, `1 bar = 2.0s`.
  - **Bar 1 (`u in [0, 2)`)**: Enter through left Portal Frame; establish setting & Title Card.
  - **Bar 2 (`u in [2, 4)`)**: Signature deadpan era gag / highlight beat (`u = 2.0` strong beat).
  - **Bar 3 (`u in [4, 6)`)**: Ride out toward right Portal Frame; exit on downbeat `u = 6.0`.
- **Caching (`kit.bakeLayer`)**: Pre-bake heavy static rock/paper/mountain/skyline textures once per scene key so steady-state headless render speed stays around `60–180 ms/frame`.
- **p5.js 2.4 Safety**: On 2D `p5.Graphics` (`g`), always pass string literals (`"center"`, `"left"`, `"top"`, `"bold"`, `"round"`, `"close"`, `"corner"`) instead of `g.CENTER` etc., and use `g.drawingContext.bezierCurveTo` for cubic beziers.

## 3. Quality, Legibility & Copyright Guardrails
- No Stage-1 placeholder badges in finished scenes.
- Every scene displays its bespoke Title Card (`drawEraTitleCard(g, meta, u)`) legible at `1920×1080` without overlapping key action.
- Strictly public-domain artistic movements and works; 100% original fictional software/app UIs, icons, handles, and audio cues.
