window.__ModuleLoader__.load({
  id: '@local/zhongtie-minutes',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;

    const API = '/zhongtie/api';
    const TYPES = ['党委会', '董事会', '总经理办公会', '专题会', '项目例会', '安全生产会', '其他'];
    const TYPE_HINT = {
      name: '人名 / 职务',
      number: '数字 / 金额',
      org: '单位 / 项目',
      decision: '决定 / 分工',
      procedure: '决策程序',
      meta: '会议信息',
    };

    // 页面切换时保留当前工作内容（工具不落盘，音频只在本机内存）
    const SESSION = {
      meta: null,
      audio: null,
      transcript: '',
      minutes: '',
      questions: null,
      answers: {},
      lengthMode: 'standard',
      savedPath: '',
      asrSeconds: 0,
    };

    const CSS = `
.ztj-page{height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.ztj-page *{box-sizing:border-box}
.ztj-wrap{max-width:1320px;margin:0 auto;padding:22px 26px 72px}
.ztj-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;flex-wrap:wrap}
.ztj-title{margin:0;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:.01em}
.ztj-sub{margin-top:6px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.ztj-pills{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ztj-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 9px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1)}
.ztj-pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.ztj-pill.ok{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}
.ztj-pill.warn{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 40%,transparent)}
.ztj-pill.bad{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}
.ztj-grid{display:grid;grid-template-columns:minmax(320px,390px) minmax(0,1fr);gap:16px;align-items:start}
@media(max-width:1020px){.ztj-grid{grid-template-columns:1fr}}
.ztj-col{display:flex;flex-direction:column;gap:14px;min-width:0}
.ztj-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:15px 16px}
.ztj-sec-head{display:flex;align-items:center;gap:9px;margin-bottom:12px;min-height:24px}
.ztj-num{width:22px;height:22px;flex:0 0 auto;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
.ztj-sec-title{font-size:14px;font-weight:650;letter-spacing:.01em}
.ztj-sec-spacer{flex:1}
.ztj-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.ztj-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ztj-field{display:flex;flex-direction:column;gap:5px;margin-bottom:10px;min-width:0}
.ztj-field:last-child{margin-bottom:0}
.ztj-label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.ztj-input,.ztj-select,.ztj-textarea{width:100%;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:7px 10px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s}
.ztj-textarea{resize:vertical;line-height:1.65}
.ztj-input:focus,.ztj-select:focus,.ztj-textarea:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent)}
.ztj-input::placeholder,.ztj-textarea::placeholder{color:var(--dsw-alias-label-secondary);opacity:.75}
.ztj-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);padding:7px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,transform .05s;white-space:nowrap}
.ztj-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,var(--dsw-alias-bg-layer-2))}
.ztj-btn:active:not(:disabled){transform:translateY(1px)}
.ztj-btn:disabled{opacity:.45;cursor:not-allowed}
.ztj-btn.primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
.ztj-btn.primary:hover:not(:disabled){background:#1e40af;border-color:#1e40af}
.ztj-btn.primary:disabled{opacity:.55}
.ztj-btn.ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}
.ztj-btn.ghost:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}
.ztj-btn.small{padding:4px 8px;font-size:11.5px;border-radius:7px}
.ztj-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ztj-rec{display:flex;align-items:center;gap:14px;padding:2px 0 10px}
.ztj-rec-btn{width:54px;height:54px;flex:0 0 auto;border-radius:50%;border:none;background:#e5484d;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(229,72,77,.28);transition:transform .1s}
.ztj-rec-btn:hover:not(:disabled){transform:scale(1.03)}
.ztj-rec-btn:disabled{opacity:.5;cursor:not-allowed}
.ztj-rec-btn.recording{animation:ztj-pulse 1.5s ease-out infinite}
.ztj-rec-dot{width:15px;height:15px;border-radius:50%;background:#fff}
.ztj-rec-square{width:14px;height:14px;border-radius:2px;background:#fff}
@keyframes ztj-pulse{0%{box-shadow:0 0 0 0 rgba(229,72,77,.42)}70%{box-shadow:0 0 0 13px rgba(229,72,77,0)}100%{box-shadow:0 0 0 0 rgba(229,72,77,0)}}
.ztj-rec-meta{min-width:0;flex:1}
.ztj-rec-state{font-size:13px;font-weight:600}
.ztj-rec-time{font-variant-numeric:tabular-nums;font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.ztj-drop{border:1.5px dashed var(--dsw-alias-border-l2);border-radius:11px;padding:16px 12px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;background:color-mix(in srgb,var(--dsw-alias-bg-base) 60%,transparent)}
.ztj-drop:hover,.ztj-drop.over{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent)}
.ztj-drop-title{font-size:12.5px;font-weight:600}
.ztj-drop-sub{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:4px}
.ztj-audio{display:flex;flex-direction:column;gap:8px}
.ztj-audio audio{width:100%;height:36px}
.ztj-audio-meta{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);min-width:0}
.ztj-audio-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-weight:600}
.ztj-warn{display:flex;gap:8px;align-items:flex-start;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 32%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,transparent);border-radius:9px;padding:8px 10px;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-primary);margin-top:10px}
.ztj-error{display:flex;gap:8px;align-items:flex-start;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);border-radius:10px;padding:9px 11px;font-size:12px;line-height:1.6;margin-bottom:14px}
.ztj-error-text{flex:1;min-width:0;overflow-wrap:anywhere}
.ztj-ok{display:flex;gap:8px;align-items:flex-start;border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 32%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);border-radius:10px;padding:9px 11px;font-size:12px;line-height:1.6;margin-top:10px;overflow-wrap:anywhere}
.ztj-progress{height:3px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden;margin-bottom:12px}
.ztj-progress>div{height:100%;background:var(--dsw-alias-brand-primary);border-radius:2px;transition:width .25s}
.ztj-progress.indeterminate>div{width:35%!important;animation:ztj-slide 1.2s ease-in-out infinite}
@keyframes ztj-slide{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}
.ztj-busy{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:12px}
.ztj-transcript{min-height:300px;font-size:13px;line-height:1.8}
.ztj-count{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.ztj-empty{display:flex;flex-direction:column;gap:8px;padding:26px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7;border:1px dashed var(--dsw-alias-border-l1);border-radius:11px}
.ztj-empty strong{color:var(--dsw-alias-label-primary);font-size:13px}
.ztj-tabs{display:inline-flex;padding:3px;border-radius:8px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1)}
.ztj-tab{border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer}
.ztj-tab.active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.ztj-md{padding:2px 2px 8px;font-size:13.5px;line-height:1.85}
.ztj-md-h{margin:18px 0 8px;line-height:1.45}
.ztj-md-h:first-child{margin-top:0}
.ztj-md-h1{font-size:19px;font-weight:700;text-align:center;margin:6px 0 16px}
.ztj-md-h2{font-size:16px;font-weight:700;border-left:3px solid var(--dsw-alias-brand-primary);padding-left:9px}
.ztj-md-h3{font-size:14.5px;font-weight:650}
.ztj-md-h4{font-size:13.5px;font-weight:650;color:var(--dsw-alias-label-secondary)}
.ztj-md-p{margin:7px 0;overflow-wrap:anywhere}
.ztj-md-list{margin:7px 0;padding-left:22px}
.ztj-md-list li{margin:3px 0;overflow-wrap:anywhere}
.ztj-md-quote{margin:9px 0;padding:7px 12px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-base);border-radius:0 7px 7px 0}
.ztj-md-hr{border:none;border-top:1px solid var(--dsw-alias-border-l1);margin:16px 0}
.ztj-table-wrap{overflow-x:auto;margin:10px 0}
.ztj-table{border-collapse:collapse;width:100%;font-size:12.5px}
.ztj-table th,.ztj-table td{border:1px solid var(--dsw-alias-border-l1);padding:6px 9px;text-align:left;vertical-align:top}
.ztj-table th{background:var(--dsw-alias-bg-base);font-weight:650;white-space:nowrap}
.ztj-shortcuts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.ztj-chip{border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;padding:4px 9px;cursor:pointer}
.ztj-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.ztj-modal{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(12,15,20,.55);backdrop-filter:blur(3px)}
.ztj-modal-box{width:min(760px,100%);max-height:calc(100vh - 44px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 26px 70px rgba(0,0,0,.38);overflow:hidden}
.ztj-modal-head{display:flex;align-items:flex-start;gap:12px;padding:16px 20px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ztj-modal-title{font-size:15px;font-weight:700;margin:0}
.ztj-modal-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:4px;line-height:1.6}
.ztj-modal-body{padding:14px 20px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.ztj-modal-foot{display:flex;align-items:center;gap:8px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.ztj-q{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;padding:11px 12px;background:var(--dsw-alias-bg-base)}
.ztj-q-head{display:flex;align-items:center;gap:7px;margin-bottom:6px;flex-wrap:wrap}
.ztj-q-type{font-size:10.5px;font-weight:700;letter-spacing:.04em;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);border-radius:5px;padding:2px 6px}
.ztj-q-text{font-size:13px;font-weight:600;line-height:1.6}
.ztj-q-quote{font-size:11.5px;color:var(--dsw-alias-label-secondary);border-left:2px solid var(--dsw-alias-border-l2);padding-left:8px;margin:7px 0;line-height:1.6;overflow-wrap:anywhere}
.ztj-q-why{font-size:11.5px;color:var(--dsw-alias-state-warn-primary);line-height:1.55;margin-bottom:7px}
.ztj-q input{width:100%;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:7px 9px;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}
.ztj-q input:focus{border-color:var(--dsw-alias-brand-primary)}
.ztj-skill{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.7;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:12px;overflow:auto;max-height:52vh;margin:0}
@media(max-width:640px){.ztj-wrap{padding:14px 12px 60px}.ztj-2col{grid-template-columns:1fr}.ztj-modal{padding:10px}.ztj-modal-box{max-height:calc(100vh - 20px)}}
`;

    function shanghaiDate() {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const value = Object.fromEntries(parts.map(({ type, value: v }) => [type, v]));
      return `${value.year}-${value.month}-${value.day}`;
    }

    function defaultMeta() {
      return {
        title: '',
        type: '党委会',
        date: shanghaiDate(),
        timeOfDay: '',
        place: '',
        host: '',
        attendees: '',
        recorder: '',
      };
    }

    function fmtClock(seconds) {
      const total = Math.max(0, Math.floor(Number(seconds) || 0));
      const hs = Math.floor(total / 3600);
      const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
      const ss = String(total % 60).padStart(2, '0');
      return hs > 0 ? `${hs}:${mm}:${ss}` : `${mm}:${ss}`;
    }

    function fmtSize(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
      return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    async function call(path, options = {}) {
      const init = {
        method: options.method || 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { ...(options.headers || {}) },
      };
      if (options.raw !== undefined) {
        init.body = options.raw;
      } else if (options.body !== undefined) {
        init.headers['content-type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      }
      let res;
      try {
        res = await fetch(API + path, init);
      } catch (error) {
        throw new Error(`无法连接本地服务：${error?.message || error}`);
      }
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`本地服务返回异常（HTTP ${res.status}）`);
      }
      if (!res.ok || data.ok === false) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
      return data;
    }

    /* ---------------- WAV：16k 单声道 ---------------- */

    function encodeWav(samples, sampleRate) {
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);
      const write = (offset, text) => {
        for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
      };
      write(0, 'RIFF');
      view.setUint32(4, 36 + samples.length * 2, true);
      write(8, 'WAVE');
      write(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      write(36, 'data');
      view.setUint32(40, samples.length * 2, true);
      let offset = 44;
      for (let i = 0; i < samples.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
      return buffer;
    }

    async function toWav(blob) {
      const bytes = await blob.arrayBuffer();
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) throw new Error('当前环境不支持音频解码');
      const audioCtx = new AudioCtor();
      let decoded;
      try {
        decoded = await audioCtx.decodeAudioData(bytes.slice(0));
      } catch {
        throw new Error('无法解码这个音频文件，请换 wav / mp3 / m4a 再试');
      } finally {
        try {
          await audioCtx.close();
        } catch {
          /* ignore */
        }
      }
      if (!decoded.duration || !Number.isFinite(decoded.duration)) throw new Error('音频时长为空，文件可能损坏');
      const rate = 16000;
      const length = Math.max(1, Math.ceil(decoded.duration * rate));
      const OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offline = new OfflineCtor(1, length, rate);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start();
      const rendered = await offline.startRendering();
      const wav = encodeWav(rendered.getChannelData(0), rate);
      return { blob: new Blob([wav], { type: 'audio/wav' }), duration: rendered.duration };
    }

    function splitWav(blob, seconds) {
      return blob.arrayBuffer().then((buffer) => {
        const view = new DataView(buffer);
        if (buffer.byteLength <= 44) return [{ blob, start: 0 }];
        const sampleRate = view.getUint32(24, true);
        const channels = view.getUint16(22, true);
        const bits = view.getUint16(34, true);
        const bytesPerSecond = (sampleRate * channels * bits) / 8;
        const chunkBytes = Math.max(1, Math.floor(bytesPerSecond * Math.max(30, Number(seconds) || 300)));
        const dataStart = 44;
        const dataBytes = buffer.byteLength - dataStart;
        const parts = [];
        for (let offset = 0, index = 0; offset < dataBytes; offset += chunkBytes, index += 1) {
          const start = dataStart + offset;
          const end = Math.min(buffer.byteLength, start + chunkBytes);
          const header = new Uint8Array(buffer.slice(0, 44));
          const headerView = new DataView(header.buffer);
          const length = end - start;
          headerView.setUint32(4, 36 + length, true);
          headerView.setUint32(40, length, true);
          parts.push({
            blob: new Blob([header, buffer.slice(start, end)], { type: 'audio/wav' }),
            start: offset / bytesPerSecond,
          });
        }
        return parts.length ? parts : [{ blob, start: 0 }];
      });
    }

    /* ---------------- Markdown 预览 ---------------- */

    function renderInline(text, key) {
      return String(text)
        .split(/(\*\*[^*]+\*\*)/g)
        .filter((part) => part !== '')
        .map((part, index) =>
          part.startsWith('**') && part.endsWith('**')
            ? h('strong', { key: `${key}-${index}` }, part.slice(2, -2))
            : part,
        );
    }

    function isTableRow(line) {
      return line.trim().startsWith('|');
    }

    function tableCells(line) {
      return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    }

    function renderMarkdown(text) {
      const lines = String(text || '').split(/\r?\n/);
      const blocks = [];
      let index = 0;
      let key = 0;
      const isDivider = (line) => /^\s*(---|\*\*\*)\s*$/.test(line);
      const isHeading = (line) => /^#{1,4}\s+/.test(line);
      const isBullet = (line) => /^\s*[-*]\s+/.test(line);
      const isOrdered = (line) => /^\s*\d+[.、)]\s+/.test(line);
      const isQuote = (line) => /^\s*>\s?/.test(line);

      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index += 1;
          continue;
        }
        if (isHeading(line)) {
          const match = line.match(/^(#{1,4})\s+(.*)$/);
          const level = match[1].length;
          blocks.push(
            h(
              `h${level + 1}`,
              { key: key++, className: `ztj-md-h ztj-md-h${level}` },
              renderInline(match[2], `h${key}`),
            ),
          );
          index += 1;
          continue;
        }
        if (isQuote(line)) {
          const buffer = [];
          while (index < lines.length && isQuote(lines[index])) {
            buffer.push(lines[index].replace(/^\s*>\s?/, ''));
            index += 1;
          }
          blocks.push(h('blockquote', { key: key++, className: 'ztj-md-quote' }, renderInline(buffer.join(' '), `q${key}`)));
          continue;
        }
        if (isDivider(line)) {
          blocks.push(h('hr', { key: key++, className: 'ztj-md-hr' }));
          index += 1;
          continue;
        }
        if (isTableRow(line)) {
          const rows = [];
          while (index < lines.length && isTableRow(lines[index])) {
            rows.push(lines[index]);
            index += 1;
          }
          if (rows.length >= 2) {
            const header = tableCells(rows[0]);
            const body = rows
              .slice(1)
              .filter((row) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(row))
              .map(tableCells);
            blocks.push(
              h(
                'div',
                { key: key++, className: 'ztj-table-wrap' },
                h(
                  'table',
                  { className: 'ztj-table' },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      null,
                      header.map((cell, cellIndex) => h('th', { key: cellIndex }, renderInline(cell, `th${cellIndex}`))),
                    ),
                  ),
                  h(
                    'tbody',
                    null,
                    body.map((row, rowIndex) =>
                      h(
                        'tr',
                        { key: rowIndex },
                        header.map((_, cellIndex) =>
                          h('td', { key: cellIndex }, renderInline(row[cellIndex] || '', `td${rowIndex}-${cellIndex}`)),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          } else {
            blocks.push(h('p', { key: key++, className: 'ztj-md-p' }, renderInline(rows[0] || '', `p${key}`)));
          }
          continue;
        }
        if (isBullet(line) || isOrdered(line)) {
          const ordered = isOrdered(line);
          const items = [];
          const test = ordered ? isOrdered : isBullet;
          while (index < lines.length && test(lines[index])) {
            items.push(lines[index].replace(ordered ? /^\s*\d+[.、)]\s+/ : /^\s*[-*]\s+/, ''));
            index += 1;
          }
          blocks.push(
            h(
              ordered ? 'ol' : 'ul',
              { key: key++, className: 'ztj-md-list' },
              items.map((item, itemIndex) => h('li', { key: itemIndex }, renderInline(item, `li${itemIndex}`))),
            ),
          );
          continue;
        }
        const buffer = [];
        while (
          index < lines.length &&
          lines[index].trim() &&
          !isHeading(lines[index]) &&
          !isQuote(lines[index]) &&
          !isDivider(lines[index]) &&
          !isTableRow(lines[index]) &&
          !isBullet(lines[index]) &&
          !isOrdered(lines[index])
        ) {
          buffer.push(lines[index].trim());
          index += 1;
        }
        blocks.push(h('p', { key: key++, className: 'ztj-md-p' }, renderInline(buffer.join(' '), `p${key}`)));
      }
      return blocks;
    }

    /* ---------------- 小组件 ---------------- */

    function Field({ label, children }) {
      return h('label', { className: 'ztj-field' }, h('span', { className: 'ztj-label' }, label), children);
    }

    function Section({ num, title, extra, children }) {
      return h(
        'section',
        { className: 'ztj-card' },
        h(
          'div',
          { className: 'ztj-sec-head' },
          h('span', { className: 'ztj-num' }, num),
          h('span', { className: 'ztj-sec-title' }, title),
          h('span', { className: 'ztj-sec-spacer' }),
          extra || null,
        ),
        children,
      );
    }

    function PanelIcon({ size = 18, active }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { opacity: active ? 1 : 0.85 },
        },
        h('path', { d: 'M6 3.5h8.5L19 8v12.5H6z' }),
        h('path', { d: 'M14 3.5V8h5' }),
        h('path', { d: 'M9 11.5v2.2M12 10.2v4.6M15 11.5v2.2' }),
      );
    }

    /* ---------------- 主工作台 ---------------- */

    function Workbench() {
      const [meta, setMeta] = useState(() => SESSION.meta || defaultMeta());
      const [audio, setAudio] = useState(() => SESSION.audio);
      const [transcript, setTranscript] = useState(() => SESSION.transcript || '');
      const [minutes, setMinutes] = useState(() => SESSION.minutes || '');
      const [lengthMode, setLengthMode] = useState(() => SESSION.lengthMode || 'standard');
      const [questions, setQuestions] = useState(() => SESSION.questions || null);
      const [answers, setAnswers] = useState(() => SESSION.answers || {});
      const [modalOpen, setModalOpen] = useState(false);
      const [skillOpen, setSkillOpen] = useState(false);
      const [skillText, setSkillText] = useState('');
      const [info, setInfo] = useState(null);
      const [recording, setRecording] = useState(false);
      const [elapsed, setElapsed] = useState(0);
      const [busy, setBusy] = useState(null);
      const [status, setStatus] = useState('');
      const [progress, setProgress] = useState(null);
      const [error, setError] = useState('');
      const [savedPath, setSavedPath] = useState(() => SESSION.savedPath || '');
      const [dragging, setDragging] = useState(false);
      const [view, setView] = useState('preview');

      const fileRef = useRef(null);
      const mediaRef = useRef(null);
      const streamRef = useRef(null);
      const chunksRef = useRef([]);
      const timerRef = useRef(null);
      const startedRef = useRef(0);
      const minutesRef = useRef(null);

      useEffect(() => {
        SESSION.meta = meta;
      }, [meta]);
      useEffect(() => {
        SESSION.audio = audio;
      }, [audio]);
      useEffect(() => {
        SESSION.transcript = transcript;
      }, [transcript]);
      useEffect(() => {
        SESSION.minutes = minutes;
      }, [minutes]);
      useEffect(() => {
        SESSION.lengthMode = lengthMode;
      }, [lengthMode]);
      useEffect(() => {
        SESSION.questions = questions;
      }, [questions]);
      useEffect(() => {
        SESSION.answers = answers;
      }, [answers]);
      useEffect(() => {
        SESSION.savedPath = savedPath;
      }, [savedPath]);

      useEffect(() => {
        let live = true;
        call('/state')
          .then((data) => {
            if (live) setInfo(data);
          })
          .catch((reason) => {
            if (live) setError(reason.message);
          });
        return () => {
          live = false;
        };
      }, []);

      useEffect(
        () => () => {
          try {
            if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
          } catch {
            /* ignore */
          }
          streamRef.current?.getTracks?.().forEach((track) => track.stop());
          if (timerRef.current) window.clearInterval(timerRef.current);
        },
        [],
      );

      const setMetaField = (key, value) => setMeta((previous) => ({ ...previous, [key]: value }));

      const resetDownstream = () => {
        setTranscript('');
        setMinutes('');
        setQuestions(null);
        setAnswers({});
        setSavedPath('');
        setProgress(null);
      };

      async function loadBlob(blob, name) {
        if (!blob || !blob.size) throw new Error('没有读到音频内容');
        if (transcript.trim() || minutes.trim()) {
          if (!window.confirm('替换音频会清空当前逐字稿和纪要，确定继续？')) return;
        }
        const max = info?.maxAudioBytes || 500 * 1024 * 1024;
        if (blob.size > max) throw new Error(`音频太大（${fmtSize(blob.size)}），上限 ${fmtSize(max)}`);
        setBusy('audio');
        setStatus('正在转成 16kHz 单声道 WAV…');
        try {
          const converted = await toWav(blob);
          const url = URL.createObjectURL(converted.blob);
          if (audio?.url) URL.revokeObjectURL(audio.url);
          resetDownstream();
          setAudio({
            url,
            blob: converted.blob,
            name: String(name || 'audio').replace(/\.[^.]+$/, '') + '.wav',
            duration: converted.duration,
            size: converted.blob.size,
          });
          setStatus('音频已就绪，点击「生成逐字稿」开始识别');
        } finally {
          setBusy(null);
        }
      }

      async function pickFile(file) {
        if (!file) return;
        const looksAudio = (file.type || '').startsWith('audio/') || /\.(wav|mp3|m4a|aac|webm|ogg|flac|amr|wma)$/i.test(file.name || '');
        if (!looksAudio) {
          setError('请选择音频文件（wav / mp3 / m4a / aac / webm / ogg / flac）');
          return;
        }
        setError('');
        try {
          await loadBlob(file, file.name);
        } catch (reason) {
          setError(reason.message);
        }
      }

      async function startRecording() {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('当前环境不支持录音，请改用「上传录音」');
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
          });
          streamRef.current = stream;
          const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
          const mimeType = candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          chunksRef.current = [];
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size) chunksRef.current.push(event.data);
          };
          recorder.onstop = async () => {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setRecording(false);
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            chunksRef.current = [];
            if (!blob.size) {
              setError('没有录到声音，请检查麦克风权限后重试');
              return;
            }
            try {
              await loadBlob(blob, `录音_${shanghaiDate()}_${fmtClock((Date.now() - startedRef.current) / 1000)}`);
            } catch (reason) {
              setError(reason.message);
            }
          };
          mediaRef.current = recorder;
          startedRef.current = Date.now();
          recorder.start(1000);
          setRecording(true);
          setElapsed(0);
          timerRef.current = window.setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
          }, 500);
        } catch (reason) {
          const message = reason?.name === 'NotAllowedError' ? '麦克风权限被拒绝，请在浏览器设置中允许后重试' : reason?.message || String(reason);
          setError(message);
        }
      }

      function stopRecording() {
        try {
          if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
        } catch {
          /* ignore */
        }
      }

      function downloadAudio() {
        if (!audio) return;
        const anchor = document.createElement('a');
        anchor.href = audio.url;
        anchor.download = audio.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      async function runTranscribe() {
        if (!audio) {
          setError('请先录音或上传音频');
          return;
        }
        setError('');
        setSavedPath('');
        setBusy('transcribe');
        setStatus('正在准备音频…');
        try {
          const chunks = await splitWav(audio.blob, info?.chunkSeconds || 300);
          setProgress({ done: 0, total: chunks.length });
          const texts = [];
          for (let index = 0; index < chunks.length; index += 1) {
            setStatus(`MiniMax 正在识别第 ${index + 1}/${chunks.length} 段…`);
            const data = await call('/transcribe', {
              method: 'POST',
              raw: chunks[index].blob,
              headers: { 'content-type': 'audio/wav', 'x-ztj-name': `part-${index + 1}.wav` },
            });
            texts.push(data.text);
            setProgress({ done: index + 1, total: chunks.length });
          }
          let merged = '';
          chunks.forEach((chunk, index) => {
            if (chunks.length > 1) merged += `【${fmtClock(chunk.start)}】\n`;
            merged += `${texts[index]}\n\n`;
          });
          setTranscript(merged.trim());
          setStatus('逐字稿已生成，可先校对，再生成纪要');
          setMinutes('');
          setQuestions(null);
        } catch (reason) {
          setError(reason.message);
          setStatus('');
        } finally {
          setBusy(null);
          setProgress(null);
        }
      }

      function startQuestionFlow() {
        if (!transcript.trim()) {
          setError('请先生成逐字稿');
          return;
        }
        if (questions && questions.length) {
          setModalOpen(true);
          return;
        }
        setError('');
        setBusy('questions');
        setStatus('正在通读逐字稿，分析必须确认的存疑点…');
        call('/questions', { method: 'POST', body: { transcript, meta } })
          .then((data) => {
            if (!data.questions.length) {
              setStatus('没有发现必须确认的存疑点，正在起草纪要…');
              return generateMinutes([], {});
            }
            const initial = {};
            data.questions.forEach((question) => {
              initial[question.id] = { answer: '', source: '' };
            });
            setQuestions(data.questions);
            setAnswers(initial);
            setModalOpen(true);
            setStatus('');
            return undefined;
          })
          .catch((reason) => setError(reason.message))
          .finally(() => setBusy((current) => (current === 'questions' ? null : current)));
      }

      async function generateMinutes(questionList, answerMap) {
        setBusy('generate');
        setStatus('正在按集团规范起草会议纪要，通常需要 20–60 秒…');
        setModalOpen(false);
        setError('');
        try {
          const ordered = (questionList || []).map((question) => {
            const value = answerMap?.[question.id] || {};
            return {
              id: question.id,
              question: question.question,
              answer: String(value.answer || '').trim() || '按逐字稿推定',
              source: value.source || 'presumed',
            };
          });
          const data = await call('/generate', {
            method: 'POST',
            body: { transcript, meta, answers: ordered, lengthMode },
          });
          setMinutes(data.markdown);
          setView('preview');
          setQuestions(null);
          setAnswers({});
          setSavedPath('');
          setStatus('纪要已生成，请逐项核对后保存');
          window.setTimeout(() => {
            try {
              minutesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch {
              /* ignore */
            }
          }, 80);
        } catch (reason) {
          setError(reason.message);
          setStatus('');
        } finally {
          setBusy(null);
        }
      }

      function submitAnswers() {
        const list = questions || [];
        const next = {};
        list.forEach((question) => {
          const value = answers[question.id] || {};
          next[question.id] = {
            answer: String(value.answer || '').trim() || '按逐字稿推定',
            source: String(value.answer || '').trim() ? value.source || 'user' : 'presumed',
          };
        });
        generateMinutes(list, next);
      }

      function setAnswer(id, value, source) {
        setAnswers((previous) => ({ ...previous, [id]: { answer: value, source } }));
      }

      async function saveMinutes() {
        if (!minutes.trim()) return;
        setBusy('save');
        setError('');
        try {
          const data = await call('/save', {
            method: 'POST',
            body: { markdown: minutes, meta, audioSeconds: audio?.duration || 0 },
          });
          setSavedPath(data.path);
          setStatus('纪要已保存到本机');
        } catch (reason) {
          setError(reason.message);
        } finally {
          setBusy(null);
        }
      }

      async function copyMinutes() {
        try {
          await navigator.clipboard.writeText(minutes);
          setStatus('已复制到剪贴板');
        } catch {
          setError('复制失败，请手动选择文本');
        }
      }

      function downloadMinutes() {
        if (!minutes.trim()) return;
        const safe = `${meta.date || shanghaiDate()}_${(meta.title || '会议纪要').replace(/[\\/:*?"<>|]/g, ' ').trim()}_纪要.md`;
        const blob = new Blob([minutes], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = safe;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      }

      function openSkill() {
        setSkillOpen(true);
        if (!skillText) {
          call('/skill')
            .then((data) => setSkillText(data.content))
            .catch((reason) => setError(reason.message));
        }
      }

      function newMeeting() {
        if ((transcript.trim() || minutes.trim()) && !window.confirm('新建会议会清空当前内容，确定继续？')) return;
        if (audio?.url) URL.revokeObjectURL(audio.url);
        setMeta(defaultMeta());
        setAudio(null);
        setTranscript('');
        setMinutes('');
        setQuestions(null);
        setAnswers({});
        setSavedPath('');
        setStatus('');
        setError('');
        setProgress(null);
        setModalOpen(false);
      }

      const asrPill = info
        ? info.asr.configured
          ? { className: 'ztj-pill ok', text: `MiniMax ${info.asr.model} 已就绪` }
          : { className: 'ztj-pill warn', text: 'MiniMax key 未配置' }
        : { className: 'ztj-pill', text: '正在检查语音服务…' };
      const llmPill = info
        ? info.llm.model
          ? { className: 'ztj-pill ok', text: `纪要模型 ${info.llm.model}` }
          : { className: 'ztj-pill warn', text: '未找到默认模型' }
        : null;

      const progressPercent =
        busy === 'transcribe' && progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;
      const showIndeterminate = Boolean(busy) && !(busy === 'transcribe' && progress);
      const disabled = Boolean(busy) || recording;
      const answeredCount = (questions || []).filter((question) => String(answers[question.id]?.answer || '').trim()).length;

      return h(
        'div',
        { className: 'ztj-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'ztj-wrap' },
          h(
            'div',
            { className: 'ztj-head' },
            h(
              'div',
              null,
              h('h1', { className: 'ztj-title' }, '中铁纪要'),
              h('div', { className: 'ztj-sub' }, '录音转写 · 存疑确认 · 按集团规范成稿'),
            ),
            h(
              'div',
              { className: 'ztj-pills' },
              h('span', { className: asrPill.className }, h('span', { className: 'dot' }), asrPill.text),
              llmPill ? h('span', { className: llmPill.className }, h('span', { className: 'dot' }), llmPill.text) : null,
              h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: openSkill }, '查看撰写规范'),
              h('button', { className: 'ztj-btn small', type: 'button', onClick: newMeeting }, '新建会议'),
            ),
          ),

          showIndeterminate
            ? h('div', { className: 'ztj-progress indeterminate' }, h('div', null))
            : busy === 'transcribe'
              ? h('div', { className: 'ztj-progress' }, h('div', { style: { width: `${progressPercent}%` } }))
              : null,
          busy ? h('div', { className: 'ztj-busy' }, status || '处理中…') : null,

          error
            ? h(
                'div',
                { className: 'ztj-error' },
                h('span', { className: 'ztj-error-text' }, error),
                h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: () => setError('') }, '知道了'),
              )
            : null,

          h(
            'div',
            { className: 'ztj-grid' },
            h(
              'div',
              { className: 'ztj-col' },
              h(
                Section,
                {
                  num: '1',
                  title: '会议信息',
                  extra: h('span', { className: 'ztj-hint' }, '用于纪要抬头与落盘'),
                },
                h(Field, { label: '会议名称' },
                  h('input', {
                    className: 'ztj-input',
                    value: meta.title,
                    placeholder: '如：XX工程局2026年三季度安全生产工作会议',
                    onChange: (event) => setMetaField('title', event.target.value),
                  }),
                ),
                h(
                  'div',
                  { className: 'ztj-2col' },
                  h(Field, { label: '会议类型' },
                    h(
                      'select',
                      { className: 'ztj-select', value: meta.type, onChange: (event) => setMetaField('type', event.target.value) },
                      (info?.meetingTypes || TYPES).map((type) => h('option', { key: type, value: type }, type)),
                    ),
                  ),
                  h(Field, { label: '会议日期' },
                    h('input', { className: 'ztj-input', type: 'date', value: meta.date, onChange: (event) => setMetaField('date', event.target.value) }),
                  ),
                ),
                h(
                  'div',
                  { className: 'ztj-2col' },
                  h(Field, { label: '开始时间' },
                    h('input', { className: 'ztj-input', value: meta.timeOfDay, placeholder: '14:30', onChange: (event) => setMetaField('timeOfDay', event.target.value) }),
                  ),
                  h(Field, { label: '会议地点' },
                    h('input', { className: 'ztj-input', value: meta.place, placeholder: '总部三楼会议室', onChange: (event) => setMetaField('place', event.target.value) }),
                  ),
                ),
                h(
                  'div',
                  { className: 'ztj-2col' },
                  h(Field, { label: '主持人' },
                    h('input', { className: 'ztj-input', value: meta.host, placeholder: '姓名（职务）', onChange: (event) => setMetaField('host', event.target.value) }),
                  ),
                  h(Field, { label: '记录人' },
                    h('input', { className: 'ztj-input', value: meta.recorder, placeholder: '姓名', onChange: (event) => setMetaField('recorder', event.target.value) }),
                  ),
                ),
                h(Field, { label: '参会人员' },
                  h('textarea', {
                    className: 'ztj-textarea',
                    rows: 2,
                    value: meta.attendees,
                    placeholder: '张三（总经理）、李四（安全总监）、各部门负责人……',
                    onChange: (event) => setMetaField('attendees', event.target.value),
                  }),
                ),
              ),

              h(
                Section,
                { num: '2', title: '录音与音频' },
                h(
                  'div',
                  { className: 'ztj-rec' },
                  h(
                    'button',
                    {
                      className: `ztj-rec-btn${recording ? ' recording' : ''}`,
                      type: 'button',
                      disabled: Boolean(busy) && !recording,
                      title: recording ? '停止录音' : '开始录音',
                      onClick: recording ? stopRecording : startRecording,
                    },
                    recording ? h('span', { className: 'ztj-rec-square' }) : h('span', { className: 'ztj-rec-dot' }),
                  ),
                  h(
                    'div',
                    { className: 'ztj-rec-meta' },
                    h('div', { className: 'ztj-rec-state' }, recording ? '正在录音…' : audio ? '音频已就绪' : '点击开始录音'),
                    h('div', { className: 'ztj-rec-time' }, recording ? fmtClock(elapsed) : audio ? `${fmtClock(audio.duration)} · ${fmtSize(audio.size)}` : '录音结束后可下载音频'),
                    recording ? h('div', { className: 'ztj-hint' }, '再次点击红色按钮停止') : null,
                  ),
                ),
                audio
                  ? h(
                      'div',
                      { className: 'ztj-audio' },
                      h('audio', { controls: true, src: audio.url, preload: 'metadata' }),
                      h(
                        'div',
                        { className: 'ztj-audio-meta' },
                        h('span', { className: 'ztj-audio-name', title: audio.name }, audio.name),
                        h('button', { className: 'ztj-btn small', type: 'button', onClick: downloadAudio }, '下载音频'),
                        h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: () => fileRef.current?.click(), disabled }, '替换'),
                      ),
                    )
                  : null,
                h(
                  'div',
                  {
                    className: `ztj-drop${dragging ? ' over' : ''}`,
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => !disabled && fileRef.current?.click(),
                    onKeyDown: (event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !disabled) fileRef.current?.click();
                    },
                    onDragOver: (event) => {
                      event.preventDefault();
                      setDragging(true);
                    },
                    onDragLeave: () => setDragging(false),
                    onDrop: (event) => {
                      event.preventDefault();
                      setDragging(false);
                      if (disabled) return;
                      const file = event.dataTransfer?.files?.[0];
                      if (file) pickFile(file);
                    },
                  },
                  h('div', { className: 'ztj-drop-title' }, audio ? '拖入或点击替换音频' : '上传录音'),
                  h('div', { className: 'ztj-drop-sub' }, '支持 wav / mp3 / m4a / aac / webm / ogg / flac'),
                ),
                h('input', {
                  ref: fileRef,
                  type: 'file',
                  accept: 'audio/*,.wav,.mp3,.m4a,.aac,.webm,.ogg,.flac',
                  style: { display: 'none' },
                  onChange: (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) pickFile(file);
                  },
                }),
                h('div', { className: 'ztj-hint', style: { marginTop: '9px' } }, '音频只用于本次识别，不会自动保存；需要留档请点「下载音频」。'),
                info && !info.asr.configured
                  ? h(
                      'div',
                      { className: 'ztj-warn' },
                      h('span', null, '⚠'),
                      h(
                        'span',
                        null,
                        '未检测到 MiniMax key。把 key 写入 ',
                        h('code', null, '~/.dsh/zhongtie-minutes/api-key'),
                        '，或设置环境变量 ',
                        h('code', null, 'MINIMAX_API_KEY'),
                        '，然后重启 DSH。',
                      ),
                    )
                  : null,
              ),
            ),

            h(
              'div',
              { className: 'ztj-col' },
              h(
                Section,
                {
                  num: '3',
                  title: '逐字稿',
                  extra: h(
                    'div',
                    { className: 'ztj-actions' },
                    h('span', { className: 'ztj-count' }, transcript ? `${transcript.replace(/\s/g, '').length} 字` : ''),
                    h(
                      'button',
                      { className: 'ztj-btn primary small', type: 'button', disabled: !audio || disabled, onClick: runTranscribe },
                      busy === 'transcribe' ? '识别中…' : transcript ? '重新生成逐字稿' : '生成逐字稿',
                    ),
                    transcript
                      ? h(
                          'button',
                          {
                            className: 'ztj-btn small ghost',
                            type: 'button',
                            disabled,
                            onClick: () => {
                              if (window.confirm('清空逐字稿？')) setTranscript('');
                            },
                          },
                          '清空',
                        )
                      : null,
                  ),
                },
                h('textarea', {
                  className: 'ztj-textarea ztj-transcript',
                  value: transcript,
                  placeholder: '录音或上传音频后点击「生成逐字稿」。识别结果会出现在这里，可直接校对、补漏。',
                  onChange: (event) => setTranscript(event.target.value),
                }),
                h('div', { className: 'ztj-hint', style: { marginTop: '8px' } }, 'MiniMax 识别结果按 5 分钟分段拼接，段首带时间戳；专业术语和人名建议人工校对后再生成纪要。'),
              ),

              h(
                'div',
                { ref: minutesRef },
                h(
                  Section,
                  {
                    num: '4',
                    title: '会议纪要',
                    extra: h(
                      'div',
                      { className: 'ztj-actions' },
                      h(
                        'div',
                        { className: 'ztj-tabs' },
                        h(
                          'button',
                          { className: `ztj-tab${lengthMode === 'standard' ? ' active' : ''}`, type: 'button', onClick: () => setLengthMode('standard') },
                          '标准',
                        ),
                        h(
                          'button',
                          { className: `ztj-tab${lengthMode === 'detailed' ? ' active' : ''}`, type: 'button', onClick: () => setLengthMode('detailed') },
                          '详细',
                        ),
                      ),
                      h(
                        'button',
                        { className: 'ztj-btn primary small', type: 'button', disabled: !transcript.trim() || disabled, onClick: startQuestionFlow },
                        busy === 'questions' || busy === 'generate' ? '处理中…' : minutes ? '重新生成' : '生成纪要',
                      ),
                    ),
                  },
                  questions && questions.length && !modalOpen
                    ? h(
                        'div',
                        { className: 'ztj-warn' },
                        h('span', null, '?'),
                        h('span', null, `还有 ${questions.length} 项存疑待确认（已答 ${answeredCount} 项）。`),
                        h('button', { className: 'ztj-btn small', type: 'button', onClick: () => setModalOpen(true) }, '继续确认'),
                      )
                    : null,
                  minutes
                    ? h(
                        'div',
                        null,
                        h(
                          'div',
                          { className: 'ztj-actions', style: { marginBottom: '10px' } },
                          h('button', { className: 'ztj-btn primary small', type: 'button', disabled, onClick: saveMinutes }, busy === 'save' ? '保存中…' : '保存到本机'),
                          h('button', { className: 'ztj-btn small', type: 'button', onClick: downloadMinutes }, '下载 .md'),
                          h('button', { className: 'ztj-btn small', type: 'button', onClick: copyMinutes }, '复制'),
                          h('span', { className: 'ztj-sec-spacer' }),
                          h(
                            'div',
                            { className: 'ztj-tabs' },
                            h('button', { className: `ztj-tab${view === 'preview' ? ' active' : ''}`, type: 'button', onClick: () => setView('preview') }, '预览'),
                            h('button', { className: `ztj-tab${view === 'edit' ? ' active' : ''}`, type: 'button', onClick: () => setView('edit') }, '编辑'),
                          ),
                        ),
                        savedPath
                          ? h('div', { className: 'ztj-ok' }, h('span', null, '✓'), h('span', null, '已保存：', h('code', null, savedPath), h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: () => copyText(savedPath) }, '复制路径')))
                          : h('div', { className: 'ztj-hint', style: { marginBottom: '8px' } }, `保存目录：${info?.outputDir || '~/Documents/中铁纪要'}`),
                        view === 'edit'
                          ? h('textarea', {
                              className: 'ztj-textarea',
                              style: { minHeight: '420px', fontSize: '13px' },
                              value: minutes,
                              onChange: (event) => setMinutes(event.target.value),
                            })
                          : h('div', { className: 'ztj-md' }, renderMarkdown(minutes)),
                      )
                    : h(
                        'div',
                        { className: 'ztj-empty' },
                        h('strong', null, '纪要会在这里生成'),
                        h('span', null, '先生成逐字稿，再点「生成纪要」：系统会先找出必须确认的存疑点，逐条问过你或按逐字稿推定，然后按集团规范起草。'),
                        h('span', null, '结构：会议基本情况 → 听取和审议 → 决定事项（责任单位/责任人/时限）→ 会议要求。'),
                        h('button', { className: 'ztj-btn small', type: 'button', onClick: openSkill, style: { alignSelf: 'center', marginTop: '4px' } }, '查看《撰写规范》'),
                      ),
                ),
              ),
            ),
          ),
        ),

        questions && modalOpen
          ? h(
              'div',
              { className: 'ztj-modal', onClick: (event) => { if (event.target === event.currentTarget) setModalOpen(false); } },
              h(
                'div',
                { className: 'ztj-modal-box' },
                h(
                  'div',
                  { className: 'ztj-modal-head' },
                  h(
                    'div',
                    { style: { flex: 1, minWidth: 0 } },
                    h('h2', { className: 'ztj-modal-title' }, `成稿前请确认 ${questions.length} 个存疑点`),
                    h('div', { className: 'ztj-modal-sub' }, '这些信息会直接影响纪要的准确性。可以选候选答案，也可以自己填写；不填的项将按逐字稿推定，并在正文标注「待核」。'),
                  ),
                  h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: () => setModalOpen(false) }, '稍后再确认'),
                ),
                h(
                  'div',
                  { className: 'ztj-modal-body' },
                  questions.map((question) =>
                    h(
                      'div',
                      { key: question.id, className: 'ztj-q' },
                      h(
                        'div',
                        { className: 'ztj-q-head' },
                        h('span', { className: 'ztj-q-type' }, TYPE_HINT[question.type] || question.type),
                        h('span', { className: 'ztj-q-text' }, question.question),
                      ),
                      question.quote ? h('div', { className: 'ztj-q-quote' }, `原文：「${question.quote}」`) : null,
                      question.why ? h('div', { className: 'ztj-q-why' }, `需确认：${question.why}`) : null,
                      question.options?.length
                        ? h(
                            'div',
                            { className: 'ztj-shortcuts' },
                            question.options.map((option) =>
                              h(
                                'button',
                                {
                                  key: option,
                                  className: 'ztj-chip',
                                  type: 'button',
                                  onClick: () => setAnswer(question.id, option, 'user'),
                                },
                                option,
                              ),
                            ),
                          )
                        : null,
                      h('input', {
                        value: answers[question.id]?.answer || '',
                        placeholder: '填写准确信息，或留空按逐字稿推定',
                        onChange: (event) => setAnswer(question.id, event.target.value, 'user'),
                      }),
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'ztj-modal-foot' },
                  h('span', { className: 'ztj-hint', style: { flex: 1 } }, `已答 ${answeredCount}/${questions.length} 项`),
                  h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: () => setModalOpen(false) }, '取消'),
                  h(
                    'button',
                    {
                      className: 'ztj-btn',
                      type: 'button',
                      onClick: () => {
                        const empty = questions.filter((question) => !String(answers[question.id]?.answer || '').trim());
                        if (empty.length) {
                          const next = {};
                          empty.forEach((question) => {
                            next[question.id] = { answer: '按逐字稿推定', source: 'presumed' };
                          });
                          setAnswers((previous) => ({ ...previous, ...next }));
                        }
                        submitAnswers();
                      },
                    },
                    '未答项按逐字稿推定',
                  ),
                  h('button', { className: 'ztj-btn primary', type: 'button', onClick: submitAnswers }, '确认并生成纪要'),
                ),
              ),
            )
          : null,

        skillOpen
          ? h(
              'div',
              { className: 'ztj-modal', onClick: (event) => { if (event.target === event.currentTarget) setSkillOpen(false); } },
              h(
                'div',
                { className: 'ztj-modal-box' },
                h(
                  'div',
                  { className: 'ztj-modal-head' },
                  h(
                    'div',
                    { style: { flex: 1 } },
                    h('h2', { className: 'ztj-modal-title' }, '中铁建工会议纪要撰写规范'),
                    h('div', { className: 'ztj-modal-sub' }, '这是生成纪要所用的 skill；也会注册给普通对话，可直接说「用 ztj-meeting-minutes 写纪要」。'),
                  ),
                  h('button', { className: 'ztj-btn small ghost', type: 'button', onClick: () => setSkillOpen(false) }, '关闭'),
                ),
                h('div', { className: 'ztj-modal-body' }, h('pre', { className: 'ztj-skill' }, skillText || '加载中…')),
              ),
            )
          : null,
      );
    }

    function copyText(text) {
      try {
        navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }

    function Standalone() {
      return h(Workbench);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'zhongtie-minutes' }, Standalone));
        } catch (error) {
          console.warn('zhongtie-minutes: main 槽位注册失败', error);
        }
        try {
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              { name: 'sidebar.panellist', id: 'zhongtie-minutes', order: 18, label: () => '中铁纪要' },
              PanelIcon,
            ),
          );
        } catch (error) {
          console.warn('zhongtie-minutes: 侧栏注册失败', error);
        }
      },
    };
  },
});
