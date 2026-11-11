/**
 * 中铁建工会议纪要 —— Host 侧
 *
 * 职责：
 *  1. 注册同源 HTTP 接口（/zhongtie/api/*），供插件工作台调用；
 *  2. 代理 MiniMax 语音识别（key 只存在本机，不下发浏览器）；
 *  3. 调用 DSH 默认模型，先做存疑分析，再按 skill 生成纪要；
 *  4. 把纪要写入本机目录（默认 ~/Documents/中铁纪要）；
 *  5. 读取 skills/ 下的撰写规范作为生成系统提示（不注册全局 skill provider，避免影响 DSH 启动）。
 */
import { mkdir, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(PKG_DIR, 'skills', 'zhongtie-meeting-minutes');
const SKILL_FILE = join(SKILL_DIR, 'SKILL.md');
const RULES_DIR = join(PKG_DIR, 'rules');
const API = '/zhongtie/api';
const ORIGIN = 'http://localhost';

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.minimaxi.com',
  asrModel: 'asr-1.0',
  apiKey: '',
  outputDir: '',
  maxAudioMB: 500,
  chunkSeconds: 300,
};

const MEETING_TYPES = ['党委会', '董事会', '总经理办公会', '专题会', '项目例会', '安全生产会', '其他'];

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function fail(message, status = 400) {
  throw new HttpError(message, status);
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

async function bodyOf(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail('请求体过大', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req, limit = 4 * 1024 * 1024) {
  const raw = await bodyOf(req, limit);
  if (!raw.length) fail('请求体为空');
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    fail('请求 JSON 格式不正确');
  }
}

function expandHome(input) {
  if (!input) return '';
  if (input === '~') return homedir();
  if (input.startsWith('~/')) return join(homedir(), input.slice(2));
  return input;
}

function resolveOutputDir(config) {
  const configured = expandHome(String(config.outputDir || '').trim());
  return configured || join(homedir(), 'Documents', '中铁纪要');
}

async function resolveApiKey(config) {
  const fromEnv = String(process.env.MINIMAX_API_KEY || '').trim();
  if (fromEnv) return fromEnv;
  const fromConfig = String(config.apiKey || '').trim();
  if (fromConfig) return fromConfig;
  try {
    const key = (await readFile(join(homedir(), '.dsh', 'zhongtie-minutes', 'api-key'), 'utf8')).trim();
    if (key) return key;
  } catch {
    /* 没配置 key 时保持静默，由界面提示 */
  }
  return '';
}

function todayShanghai() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: v }) => [type, v]));
  return `${value.year}-${value.month}-${value.day}`;
}

function clipTranscript(text, maxChars = 120000) {
  const value = String(text || '').trim();
  if (value.length <= maxChars) return value;
  const head = Math.floor(maxChars * 0.7);
  const tail = maxChars - head;
  return `${value.slice(0, head)}\n\n……（中间内容过长，已省略 ${value.length - maxChars} 字）……\n\n${value.slice(-tail)}`;
}

function describeMeta(meta = {}) {
  const rows = [
    ['会议名称', meta.title],
    ['会议类型', meta.type || '未注明'],
    ['会议时间', meta.date ? `${meta.date}${meta.timeOfDay ? ` ${meta.timeOfDay}` : ''}` : '未注明'],
    ['会议地点', meta.place || '未注明'],
    ['主持人', meta.host || '未注明'],
    ['参会人员', meta.attendees || '未注明'],
    ['记录人', meta.recorder || '未注明'],
  ];
  return rows.map(([k, v]) => `- ${k}：${String(v || '').trim() || '未注明'}`).join('\n');
}

function describeAnswers(answers = {}) {
  const rows = Array.isArray(answers) ? answers : Object.values(answers || {});
  if (!rows.length) return '（无存疑问题，全部依据逐字稿）';
  return rows
    .filter((item) => item && item.answer)
    .map((item, index) => `${index + 1}. 问：${item.question || ''}\n   答：${item.answer}`)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* MiniMax ASR                                                         */
/* ------------------------------------------------------------------ */

async function transcribeWithMiniMax(bytes, name, config, apiKey) {
  const base = String(config.baseUrl || DEFAULT_CONFIG.baseUrl).replace(/\/+$/, '');
  const form = new FormData();
  form.set('model', String(config.asrModel || DEFAULT_CONFIG.asrModel));
  form.set('file', new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }), name || 'audio.wav');

  let res;
  try {
    res = await fetch(`${base}/v1/speech_to_text`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(300000),
    });
  } catch (error) {
    const reason = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? '请求超时' : '网络不通';
    fail(`MiniMax 语音识别${reason}：${error?.message || error}`, 502);
  }

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    fail(`MiniMax 返回了非 JSON 内容（HTTP ${res.status}）：${raw.slice(0, 200)}`, 502);
  }

  if (!res.ok) {
    const message = data?.base_resp?.status_msg || data?.message || raw.slice(0, 300);
    fail(`MiniMax 语音识别失败（HTTP ${res.status}）：${message}`, 502);
  }
  if (data?.base_resp && data.base_resp.status_code !== 0) {
    fail(`MiniMax 语音识别失败（${data.base_resp.status_code}）：${data.base_resp.status_msg || '未知错误'}`, 502);
  }

  const text = String(data?.text ?? data?.data?.text ?? '').trim();
  if (!text) {
    fail('MiniMax 未返回识别文本。请检查音频是否为空、格式是否为 16k 单声道 WAV。', 502);
  }
  return {
    text,
    duration: Number(data?.duration ?? data?.audio_duration ?? 0) || null,
    traceId: data?.trace_id || null,
  };
}

/* ------------------------------------------------------------------ */
/* LLM                                                                 */
/* ------------------------------------------------------------------ */

function llmTarget(ctx) {
  const llm = ctx.get('llm');
  if (!llm || typeof llm.stream !== 'function') fail('LLM 服务不可用，请重启 DSH 后重试', 503);
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.();
  if (!selection?.provider || !selection?.model) {
    fail('未找到默认模型，请先在「设置 → 模型」中选择一个模型', 503);
  }
  return { llm, selection };
}

async function complete(ctx, { system, prompt, maxTokens = 4000 }) {
  const { llm, selection } = llmTarget(ctx);
  let output = '';
  const stream = llm.stream({
    provider: selection.provider,
    model: selection.model,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxTokens,
  });
  for await (const chunk of stream) {
    if (chunk.type === 'text-delta') {
      output += chunk.text || '';
    } else if (chunk.type === 'finish') {
      const kind = chunk.reason?.kind;
      if (kind === 'error' || kind === 'aborted') {
        const detail = chunk.reason?.error?.message || chunk.reason?.message || kind;
        fail(`模型生成中断：${detail}`, 502);
      }
    }
  }
  const text = output.trim();
  if (!text) fail('模型没有返回内容，请稍后重试', 502);
  return text;
}

function parseJsonArray(text) {
  const value = String(text || '').trim();
  const candidates = [value];
  const start = value.indexOf('[');
  const end = value.lastIndexOf(']');
  if (start >= 0 && end > start) candidates.push(value.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* 继续尝试 */
    }
  }
  return null;
}

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const question = String(item.question || '').trim();
    if (!question || seen.has(question)) continue;
    seen.add(question);
    const options = Array.isArray(item.options)
      ? item.options.map((option) => String(option).trim()).filter(Boolean).slice(0, 4)
      : [];
    out.push({
      id: String(item.id || `q${out.length + 1}`),
      type: String(item.type || 'meta').trim() || 'meta',
      question,
      quote: String(item.quote || '').trim().slice(0, 160),
      why: String(item.why || '').trim().slice(0, 200),
      options,
    });
    if (out.length >= 5) break;
  }
  return out;
}

const QUESTION_SYSTEM = `你是中铁建工（CRCEG）会议纪要编辑助手，负责在成稿前找出必须向记录人确认的存疑点。
你只输出 JSON 数组，不输出解释、前后缀或 Markdown 代码围栏。`;

function buildQuestionPrompt({ transcript, meta }) {
  return `请通读下面的会议逐字稿，找出成稿前必须向记录人确认的存疑点。

会议信息：
${describeMeta(meta)}

逐字稿：
"""
${clipTranscript(transcript)}
"""

检查范围（六类）：
1. name：只有"张总/李局/王经理"等称呼，或姓名同音、职务不明；
2. number：投资额、合同额、面积、里程、比例、人数、工期等口语数字（如"三个亿""十来个"）；
3. org：单位、项目、标段的简称或全称不明；
4. decision：是否形成决议、责任单位、责任人、完成时限不明确；
5. procedure：是否属于"三重一大"、是否需党委前置研究或报上级审批；
6. meta：会议时间、地点、主持人、参会人员、记录人缺失或矛盾。

输出要求：
- 只输出 JSON 数组，最多 5 条，按影响程度从高到低排序；
- 每条格式：{"id":"q1","type":"name|number|org|decision|procedure|meta","question":"具体、可直接回答的问题","quote":"逐字稿原文片段，不超过60字","why":"为什么必须确认，不超过60字","options":["候选答案1","候选答案2"]}
- options 给 2-4 个能从上下文推断的候选；无法推断时给空数组；
- 不要提出逐字稿已经写清楚的问题；没有存疑时输出 []。`;
}

function buildMinutesPrompt({ transcript, meta, answers, lengthMode }) {
  const detailed = lengthMode === 'detailed';
  return `请依据下面的会议信息、存疑确认结果和逐字稿，撰写一份正式会议纪要。

会议信息：
${describeMeta(meta)}

记录人对存疑问题的确认：
${describeAnswers(answers)}

逐字稿：
"""
${clipTranscript(transcript)}
"""

写作要求：
1. 严格遵循系统提示中的《中铁建工会议纪要撰写规范》，采用七段式（可选项按实际情况取舍）；
2. 篇幅：${detailed ? '详细版，2500-4000 字，决定事项逐条展开' : '标准版，1200-2200 字，重点突出决定事项'};
3. 只输出 Markdown 正文，从一级标题开始，不要输出代码围栏、不要解释写作过程；
4. 决定事项必须有责任单位、责任人、完成时限；信息缺失写"（待核）"；
5. 不得编造逐字稿和确认结果中没有的人名、数字、单位、文号、制度名称；
6. 记录人已确认的内容直接采用；标为"按逐字稿推定"的，在对应位置加"（待核）"；
7. 语言统一为"会议认为/会议指出/会议强调/会议决定/会议同意"，不得残留口语。`;
}

/* ------------------------------------------------------------------ */
/* 纪要落盘                                                            */
/* ------------------------------------------------------------------ */

function sanitizeName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function yamlString(value) {
  return `"${String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

function buildFrontmatter(meta, extra = {}) {
  const lines = [
    '---',
    `title: ${yamlString(meta.title || '会议纪要')}`,
    `meeting_type: ${yamlString(meta.type || '')}`,
    `date: ${yamlString(meta.date || todayShanghai())}`,
    `host: ${yamlString(meta.host || '')}`,
    `attendees: ${yamlString(meta.attendees || '')}`,
    `recorder: ${yamlString(meta.recorder || '')}`,
    'source: zhongtie-minutes',
    'generated_at: ' + yamlString(new Date().toISOString()),
  ];
  if (extra.audioSeconds) lines.push(`audio_seconds: ${Number(extra.audioSeconds)}`);
  lines.push('---', '');
  return lines.join('\n');
}

async function uniquePath(dir, base) {
  let candidate = join(dir, `${base}.md`);
  try {
    await access(candidate);
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    candidate = join(dir, `${base}_${stamp}.md`);
  } catch {
    /* 文件不存在，直接使用 */
  }
  return candidate;
}

/* ------------------------------------------------------------------ */
/* skill 内容                                                          */
/* ------------------------------------------------------------------ */

async function readRules() {
  try {
    const entries = await readdir(RULES_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && /\.(md|txt)$/i.test(entry.name)).map((e) => e.name).sort();
    const parts = [];
    let budget = 40000;
    for (const file of files) {
      if (budget <= 0) break;
      const text = await readFile(join(RULES_DIR, file), 'utf8');
      const slice = text.slice(0, Math.min(budget, 12000));
      parts.push(`### 制度参考：${file}\n${slice}`);
      budget -= slice.length;
    }
    return parts.join('\n\n');
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

async function handle(ctx, config, req, res) {
  const url = new URL(req.url || '/', ORIGIN);
  const path = url.pathname.slice(API.length) || '/';

  const connection = ctx.get?.('connection');
  const rejection = connection?.requestRejection?.(req);
  if (rejection) {
    sendJson(res, rejection, { ok: false, error: '需要从 DSH 界面内访问' });
    return;
  }

  if (req.method === 'GET' && path === '/state') {
    const key = await resolveApiKey(config);
    const selection = ctx.get('agentDefaultModel')?.currentSelection?.();
    sendJson(res, 200, {
      ok: true,
      asr: { configured: Boolean(key), provider: 'minimax', model: config.asrModel || DEFAULT_CONFIG.asrModel },
      llm: { provider: selection?.provider || null, model: selection?.model || null },
      outputDir: resolveOutputDir(config),
      maxAudioBytes: Math.max(1, Number(config.maxAudioMB) || 500) * 1024 * 1024,
      chunkSeconds: Math.max(30, Number(config.chunkSeconds) || 300),
      meetingTypes: MEETING_TYPES,
    });
    return;
  }

  if (req.method === 'GET' && path === '/skill') {
    sendJson(res, 200, { ok: true, content: await readFile(SKILL_FILE, 'utf8') });
    return;
  }

  if (req.method === 'POST' && path === '/transcribe') {
    const key = await resolveApiKey(config);
    if (!key) fail('尚未配置 MiniMax API key：请把 key 写入 ~/.dsh/zhongtie-minutes/api-key，或设置环境变量 MINIMAX_API_KEY', 503);
    const limit = Math.max(1, Number(config.maxAudioMB) || 500) * 1024 * 1024;
    const bytes = await bodyOf(req, limit);
    if (!bytes.length) fail('没有收到音频数据');
    const name = String(req.headers['x-zhongtie-name'] || 'audio.wav').replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
    const result = await transcribeWithMiniMax(bytes, name, config, key);
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'POST' && path === '/questions') {
    const body = await readJson(req);
    const transcript = String(body.transcript || '').trim();
    if (!transcript) fail('逐字稿为空，请先录音或上传并生成逐字稿');
    const text = await complete(ctx, {
      system: QUESTION_SYSTEM,
      prompt: buildQuestionPrompt({ transcript, meta: body.meta || {} }),
      maxTokens: 1200,
    });
    let parsed = parseJsonArray(text);
    if (!parsed) {
      // 模型偶尔会包一层解释，给一次纠正机会
      const retry = await complete(ctx, {
        system: QUESTION_SYSTEM,
        prompt: `把下面的内容整理为要求的 JSON 数组，只输出数组本身：\n${text.slice(0, 4000)}`,
        maxTokens: 1200,
      });
      parsed = parseJsonArray(retry);
    }
    sendJson(res, 200, { ok: true, questions: normalizeQuestions(parsed || []) });
    return;
  }

  if (req.method === 'POST' && path === '/generate') {
    const body = await readJson(req);
    const transcript = String(body.transcript || '').trim();
    if (!transcript) fail('逐字稿为空，请先录音或上传并生成逐字稿');
    const skillText = await readFile(SKILL_FILE, 'utf8');
    const rules = await readRules();
    const system = [
      skillText,
      rules ? `\n\n# 集团制度参考（仅作表述依据，不得编造条款）\n${rules}` : '',
      '\n\n# 输出约束\n只输出 Markdown 正文；不要输出代码围栏；不要解释写作过程；不得编造输入中没有的事实。',
    ].join('');
    const markdown = await complete(ctx, {
      system,
      prompt: buildMinutesPrompt({
        transcript,
        meta: body.meta || {},
        answers: body.answers || {},
        lengthMode: body.lengthMode,
      }),
      maxTokens: body.lengthMode === 'detailed' ? 9000 : 6000,
    });
    const cleaned = markdown.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```\s*$/, '').trim();
    sendJson(res, 200, { ok: true, markdown: cleaned });
    return;
  }

  if (req.method === 'POST' && path === '/save') {
    const body = await readJson(req);
    const markdown = String(body.markdown || '').trim();
    if (!markdown) fail('纪要内容为空');
    const meta = body.meta || {};
    const dir = resolveOutputDir(config);
    await mkdir(dir, { recursive: true });
    const date = String(meta.date || todayShanghai()).slice(0, 10);
    const title = sanitizeName(meta.title || '会议纪要');
    const base = sanitizeName(`${date}_${title}_纪要`) || `会议纪要_${date}`;
    const target = await uniquePath(dir, base);
    const content = `${buildFrontmatter(meta, { audioSeconds: body.audioSeconds })}${markdown}\n`;
    await writeFile(target, content, 'utf8');
    sendJson(res, 200, { ok: true, path: target, dir });
    return;
  }

  fail('接口不存在', 404);
}

export const name = 'zhongtie-minutes';

export function apply(ctx, config) {
  const merged = { ...DEFAULT_CONFIG, ...(config || {}) };

  try {
    ctx.effect(() =>
      ctx.webServer.register({
      kind: 'prefix',
      path: API,
      async handler(req, res) {
        try {
          await handle(ctx, merged, req, res);
        } catch (error) {
          if (res.headersSent) {
            try {
              res.end();
            } catch {
              /* ignore */
            }
            return;
          }
          const status = error instanceof HttpError ? error.status : 500;
          const message = error instanceof Error ? error.message : String(error);
          if (status >= 500) ctx.logger?.error?.(`zhongtie-minutes: ${error?.message || error}`);
          sendJson(res, status, { ok: false, error: message });
        }
        },
      }),
    );
  } catch (error) {
    ctx.logger?.warn?.(`zhongtie-minutes: 路由注册失败：${error?.message || error}`);
  }
}

export const inject = ['webServer'];
