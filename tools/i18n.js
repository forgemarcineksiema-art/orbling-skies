/* Translation helper for the languages beyond EN/PL (src/core/lang/<code>.js are the source of truth).
 *   node tools/i18n.js todo [code …]         → i18n_todo.json: every key a language lacks, with its EN and PL text
 *   node tools/i18n.js merge <code> <file>   → merges a flat JSON { key: text } into src/core/lang/<code>.js
 *                                              (rewritten in the English key order; unknown keys are dropped)
 * Translations keep every {placeholder}; plural blocks {n|one|other} have the forms the language needs
 * (tools/check.js validates placeholders; STRICT=1 also fails on missing keys). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Intl, document: { documentElement: {} }, navigator: { language: 'en' } };
vm.createContext(ctx);
const langDir = path.join(root, 'src/core/lang');
const langFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.js')).map(f => 'src/core/lang/' + f);
vm.runInContext(['src/core/util.js', 'src/core/i18n.js', ...langFiles].map(read).join('\n;\n') + '\n;this.I18N = I18N; this.LANGS = LANGS;', ctx);
const { I18N, LANGS } = ctx;
const keys = Object.keys(I18N.en);
const NAMES = Object.fromEntries(LANGS);

function write(code, dict) {
  const body = keys.filter(k => dict[k] != null).map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(dict[k]) + ',').join('\n');
  const js = `'use strict';\n/* ${NAMES[code] || code} (${code === 'pt' ? 'pt-BR' : code}) — translated from English. Missing keys fall back to English; merge new ones with tools/i18n.js. */\nLX('${code}', {\n${body}\n});\n`;
  fs.writeFileSync(path.join(langDir, code + '.js'), js, 'utf8');
  return keys.filter(k => dict[k] != null).length;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'todo') {
  const codes = args.length ? args : LANGS.map(x => x[0]).filter(c => c !== 'en' && c !== 'pl');
  const out = {};
  for (const c of codes) for (const k of keys) if ((I18N[c] || {})[k] == null) out[k] = { en: I18N.en[k], pl: I18N.pl[k] };
  fs.writeFileSync(path.join(root, 'i18n_todo.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log(Object.keys(out).length, 'keys to translate → i18n_todo.json');
} else if (cmd === 'merge') {
  const [code, file] = args;
  if (!code || !file) { console.log('usage: node tools/i18n.js merge <code> <file.json>'); process.exit(1); }
  const add = JSON.parse(fs.readFileSync(file, 'utf8'));
  const n = write(code, Object.assign({}, I18N[code] || {}, add));
  console.log(code, n, 'keys');
} else if (cmd === 'format') {
  for (const f of langFiles) { const c = path.basename(f, '.js'); console.log(c, write(c, I18N[c])); }
} else console.log('usage: node tools/i18n.js todo [code …] | merge <code> <file.json> | format');
