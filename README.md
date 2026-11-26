# 鹈鹕测试 · 视频制作 Skill

这是一个 Agent Skill，记录并附带了短片 **《鹈鹕测试》** 的完整制作流程：一只鹈鹕骑着自行车，穿过 20 个艺术史时代的画风。成片 2:17 · 120 BPM · 1080p · 60fps，全程序化生成。

## 目录结构

```
.
├── LICENSE                      # MIT 协议
├── README.md
└── pelican-test-video/
    ├── SKILL.md                 # Skill 本体（给 Agent 执行的流程）
    ├── references/STYLE_SPEC.md # 场景统一风格规范
    ├── scripts/build-covers.mjs # 16:9 / 4:3 / 3:4 封面生成脚本
    └── engine/                  # 可直接运行的完整项目
        ├── src/                 # 节拍时间线、骨骼木偶、工具集、20 个时代场景及片头片尾
        ├── audio/               # 程序化 Web Audio 配乐与音效
        ├── tools/               # 截帧、接触表、逐帧渲染、音频渲染、编码等工具
        ├── briefs/              # 20 份美术简报 + 风格规范
        └── public/ *.html package.json
```

## 制作流程

1. **画面**：基于 p5.js + p5.brush，每个场景都是时间的纯函数，用 Puppeteer + Chrome for Testing 逐帧渲染。
2. **配音（配乐与音效）**：用 Web Audio 离线合成 48kHz WAV，不使用采样、TTS 或旁白。
3. **合流**：FFmpeg 将帧序列与音频编码为 MP4。
4. **封面**：用引擎真实渲染帧合成 16:9、4:3 横版、3:4 竖版三张封面。

## 快速开始

```bash
cp -R pelican-test-video/engine my-pelican && cd my-pelican
npm install
npx @puppeteer/browsers install chrome@stable --path .browsers   # 或设置 CHROME_PATH
npm run preview            # 实时预览
npm run build-film         # 音频 + 8220 帧 + MP4，输出到 out/
node ../pelican-test-video/scripts/build-covers.mjs   # 封面输出到 out/（路径请按你的复制位置调整）
```

环境要求：Node.js 18+、FFmpeg，以及数 GB 的帧序列磁盘空间。

## 作为 Skill 使用

把 `pelican-test-video/` 放入你的 Agent 技能目录（如项目的 `.agents/skills/` 或全局技能目录），Agent 会读取 `SKILL.md` 并按流程执行。

## 协议

MIT，见 [LICENSE](./LICENSE)。第三方组件见 `pelican-test-video/engine/THIRD_PARTY_NOTICES.md`。
