'use strict';
const crypto = require('node:crypto');
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const VARIABLES = new Set(['USER_ID','USER_PUBLIC_ID','SCRIPT_SLUG','SCRIPT_VERSION','ISSUED_AT','CLIENT_IP','SITE_URL']);
function validSlug(value) { return typeof value === 'string' && SLUG_RE.test(value); }
function userId() {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let out = '';
  while (out.length < 9) for (const byte of crypto.randomBytes(32)) { if (byte < 248) out += alphabet[byte % 62]; if (out.length === 9) break; }
  return out;
}
function validateScript(source, { runBash = true, publishing = true } = {}) {
  if (typeof source !== 'string') return { ok:false, error:'Текст скрипта обязателен.' };
  if (Buffer.byteLength(source, 'utf8') > 1024 * 1024) return { ok:false, error:'Скрипт превышает лимит 1 МБ.' };
  if (source.includes('\uFFFD') || Buffer.from(source, 'utf8').toString('utf8') !== source) return { ok:false, error:'Скрипт должен иметь кодировку UTF-8.' };
  if (source.charCodeAt(0) === 0xFEFF) return { ok:false, error:'Удалите BOM в начале файла.' };
  const normalized = source.replace(/\r\n?/g, '\n');
  if (publishing && !normalized.startsWith('#!/usr/bin/env bash')) return { ok:false, error:'Первая строка должна быть #!/usr/bin/env bash.' };
  if (publishing) {
    for (const match of normalized.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) if (!VARIABLES.has(match[1])) return { ok:false, error:`Неизвестный плейсхолдер: {{${match[1]}}}` };
    if (/\{\{[^{}]*\}\}/.test(normalized.replace(/\{\{[A-Z0-9_]+\}\}/g,''))) return { ok:false, error:'Некорректный плейсхолдер.' };
  }
  let syntax = null;
  if (runBash && publishing) {
    try { const {spawnSync}=require('node:child_process'); const r=spawnSync('bash',['-n'],{input:normalized,encoding:'utf8',timeout:3000}); if (r.error?.code !== 'ENOENT' && (r.status !== 0 || r.error)) syntax=(r.stderr||r.error?.message||'Ошибка синтаксиса bash.').trim(); }
    catch (e) { syntax=e.message; }
  }
  return syntax ? {ok:false,error:`Ошибка bash -n: ${syntax}`,normalized} : {ok:true,normalized,warning:normalized!==source?'CRLF/CR автоматически нормализованы в LF.':''};
}
function renderScript(source, values) {
  const safe = {};
  for (const key of VARIABLES) {
    const value = String(values[key] ?? '');
    if (!/^[A-Za-z0-9._:/-]*$/.test(value)) throw new Error(`Недопустимое значение переменной ${key}.`);
    safe[key] = `'${value}'`;
  }
  return source.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (!VARIABLES.has(key)) throw new Error(`Неизвестный плейсхолдер: {{${key}}}`);
    return safe[key];
  });
}
function hasScriptAccess(script, user) { return !!user && !user.blocked && !!script && script.status==='published'; }
function immutableVersion(script, content, author, comment='') {
  const version=(script.version_counter||0)+1, created_at=new Date().toISOString();
  return {id:crypto.randomUUID(),script_id:script.id,version,content,sha256:crypto.createHash('sha256').update(content,'utf8').digest('hex'),comment:String(comment).slice(0,500),author,created_at};
}
module.exports={SLUG_RE,VARIABLES,validSlug,userId,validateScript,renderScript,hasScriptAccess,immutableVersion};
