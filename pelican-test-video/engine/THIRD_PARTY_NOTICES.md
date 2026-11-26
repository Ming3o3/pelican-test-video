# Third-Party Notices

This project ("《鹈鹕测试》 / The Pelican Test") uses or interacts with the following third-party components and tools. All source code in this repository is written cleanly from scratch.

## Libraries & Tools

- **p5.js** (2.x) — GNU Lesser General Public License v2.1 (LGPL-2.1)
  - Website: https://p5js.org
  - Vendored locally into `public/vendor/` from npm package `p5` without modification.

- **p5.brush** (3.x) — MIT License
  - Copyright (c) 2023-2026 Alejandro Campos Uribe
  - Repository: https://github.com/acamposuribe/p5.brush
  - Vendored locally into `public/vendor/` from npm package `p5.brush` without modification.

- **puppeteer-core** & **@puppeteer/browsers** — Apache License 2.0
  - Repository: https://github.com/puppeteer/puppeteer
  - Used for headless frame capture and installing a local Chrome for Testing binary.

- **Chrome for Testing** — Google Chrome Terms / Chromium BSD-style licenses
  - Downloaded locally into `.browsers/` (not committed) via `@puppeteer/browsers`.

- **FFmpeg** — LGPL / GPL (invoked as an external CLI tool installed on the host; not bundled).

- **Host System Fonts** — macOS built-in fonts (such as `Songti SC`, `STSong`, `PingFang SC`, `Menlo`, `Georgia`) used for text rendering at runtime and not redistributed.

## Artistic Homage & Original UI Policy

- Historical art references are strictly limited to public-domain artistic movements and historical works (e.g., Tassili rock art, Ancient Egyptian tomb painting, Han stone rubbings, Tang baimiao, Song Dynasty shan-shui, Zhang Zeduan's *Along the River During the Qingming Festival*, Maya codices, Mughal miniatures, Bada Shanren, Wayang Kulit, Hiroshige's *Fifty-three Stations of the Tōkaidō*, Van Gogh's *The Starry Night*, Munch's *The Scream*, and *Nosferatu* (1922)).
- All software interfaces, chat windows, 8-bit video game elements, short-video apps, news microphones, and fictional book/publication titles are completely original fictional designs and parodies containing no real logos, trademarks, copyrighted game assets, or external audio/visual media.
