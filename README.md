# 中铁纪要 · dsh-zhongtie-minutes

一个面向 **中铁建工（CRCEG）会议场景** 的 DeepSeek Harness（DSH）插件：录音／上传 → 语音转写 → 存疑确认 → 按集团公文规范生成会议纪要。

> 个人开源项目，不是中铁建工官方产品。生成的纪要必须经人工复核后方可正式行文。

## 功能

| # | 能力 | 说明 |
| --- | --- | --- |
| 1 | 录音与下载 | 点击开始／停止录音，自动转 16kHz 单声道 WAV；可试听、下载音频 |
| 2 | 上传录音 | 支持 wav / mp3 / m4a / aac / webm / ogg / flac，可拖拽 |
| 3 | 生成逐字稿 | 按 5 分钟分片调用 MiniMax `asr-1.0`，段首带时间戳，可在线校对 |
| 4 | 生成会议纪要 | 基于内置 `zhongtie-meeting-minutes` skill：七段式体例、国企公文语言、"三重一大"、责任分工表；标准／详细两档篇幅 |
| 5 | 存疑确认 | 成稿前分析人名职务、数字金额、单位项目、决定分工、决策程序、会议元信息六类疑点，弹窗逐条确认；未确认项标「待核」，不静默编造 |

## 界面

左侧栏「中铁纪要」进入全宽工作台，四个区域：

1. **会议信息**：名称、类型、时间、地点、主持人、参会人、记录人
2. **录音 / 上传**：录制、试听、下载、上传
3. **逐字稿**：分片转写、进度、编辑
4. **会议纪要**：存疑弹窗 → Markdown 预览 → 下载 / 保存到本机

## 前置条件

- 已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）桌面端或 Web 端
- Node.js ≥ 22（DSH 自带运行时即可）
- 一个 MiniMax 开放平台 API Key（语音识别 `asr-1.0`）

## 安装

```bash
git clone https://github.com/developer-hq/dsh-zhongtie-minutes.git
cd dsh-zhongtie-minutes
```

在 DSH 对话中让 Agent 安装本地 bundle（把路径换成你的克隆目录）：

```text
plugin_manager install_bundle target=/absolute/path/to/dsh-zhongtie-minutes
```

或在 DSH 的「插件」页面安装该目录。安装完成后左侧出现「中铁纪要」。

## 配置 MiniMax Key

Host 按以下顺序读取，Key 不会下发到浏览器：

1. 环境变量 `MINIMAX_API_KEY`
2. 插件配置 `apiKey`
3. `~/.dsh/zhongtie-minutes/api-key`（推荐）

```bash
mkdir -p ~/.dsh/zhongtie-minutes
printf '%s' 'sk-your-minimax-key' > ~/.dsh/zhongtie-minutes/api-key
chmod 600 ~/.dsh/zhongtie-minutes/api-key
```

其他配置见 `cordis.patch.yml`：

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| `baseUrl` | `https://api.minimaxi.com` | MiniMax 开放平台地址 |
| `asrModel` | `asr-1.0` | 语音识别模型 |
| `outputDir` | 空 → `~/Documents/中铁纪要/` | 纪要保存目录 |
| `maxAudioMB` | `500` | 单次上传上限 |
| `chunkSeconds` | `300` | 逐字稿分片长度（秒） |
| `reasoningEffort` | `low` | 生成纪要的推理强度。`deepseek-flash` 用 `max` 会把 token 全花在思考上，正文可能为空；可选 `low` / `high` / `max` |

## 使用流程

1. 打开「中铁纪要」，填写会议信息（至少填会议名称）。
2. 点红色按钮录音，结束后点停止；或直接上传已有录音。
3. 点「生成逐字稿」，等待分片转写完成，按需校对。
4. 点「生成纪要」。若存在存疑点，会弹窗逐条提问；可选择候选答案或自行填写。
5. 确认后生成 Markdown 纪要，可复制、下载 `.md`，或保存到本机目录。

音频只在本机内存与 MiniMax 接口之间传递，**不自动落盘**；需要留档时手动点「下载音频」。

## 技术架构

```
浏览器（client.js）                     DSH Host（index.js）
────────────────────                   ─────────────────────
MediaRecorder / 上传                    /zhongtie/api/state
  └─ WebAudio 重采样 16k WAV             /zhongtie/api/skill
  └─ 5 分钟切片                          /zhongtie/api/transcribe → MiniMax ASR
  └─ fetch 同源请求                       /zhongtie/api/questions  → DSH LLM
  └─ 存疑弹窗 / Markdown 预览             /zhongtie/api/generate   → DSH LLM + SKILL.md
                                          /zhongtie/api/save       → 本机 Markdown
```

- Host 通过 `ctx.webServer.register({ kind: 'prefix', path: '/zhongtie/api' })` 注册同源接口，并用 `ctx.connection.requestRejection` 做来源校验。
- 纪要生成复用 DSH 当前默认模型（`agentDefaultModel` + `llm.stream`），无需再配一个大模型 Key。
- skill 不注册到全局 skills 目录，避免 provider 契约不一致影响 DSH 启动；`SKILL.md` 在生成时作为系统提示注入。

## 撰写规范（skill）

`skills/zhongtie-meeting-minutes/SKILL.md` 包含：

- 七段式纪要体例：标题、会议基本情况、听取和审议情况、决定事项、会议要求、督办落实、分送抄送
- 国企公文语言规范与禁用表述
- "三重一大"决策程序及会议权限提示
- 六类存疑点与提问协议
- 责任分工表写法、保密要求、10 条质量自检清单、完整示例

`rules/` 用于放本单位制度摘录（`.md` / `.txt`），生成时会拼入系统提示作为表述依据；仓库默认不含任何内部制度原文。

## 目录结构

```
zhongtie-minutes/
├── index.js                 # Host：HTTP 路由、MiniMax ASR、LLM 两阶段、保存
├── client.js                # 浏览器：录音/上传/转写/弹窗/Markdown 预览
├── cordis.patch.yml         # 插件配置
├── package.json
├── locale/{zh,en}.json
├── icon.svg
├── skills/zhongtie-meeting-minutes/SKILL.md
└── rules/README.md
```

## 开发与测试

Host 端可在 Node 中直接跑 mock 测试：伪造 `ctx.webServer`、`ctx.llm` 与 MiniMax 接口，覆盖 state / skill / transcribe / questions / generate / save 六条路径。

```bash
node --check index.js
node --check client.js
npm pack          # 生成可安装的 tgz
```

修改 Host 代码后，在 DSH 中重新加载插件（或重启 DSH）生效；浏览器端由 DSH 的模块加载器热更新。

## 隐私与边界

- **Key**：只存本机，接口响应不回传 Key。
- **音频**：上传到 MiniMax 用于识别，不写入磁盘；浏览器页面刷新即丢失。
- **纪要**：默认保存到 `~/Documents/中铁纪要/`，不写入 Obsidian。
- **涉密**：涉密会议请勿使用公有云语音识别；请改用本地部署的识别服务并自行评估合规性。
- **识别质量**：专业术语、人名同音字、方言口音可能需要人工校对。
- **模型生成**：纪要由大模型生成，存在遗漏或措辞偏差，必须人工复核。

## License

[MIT](LICENSE)
