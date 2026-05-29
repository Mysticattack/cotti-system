/**
 * Hilfsfunktionen fuer Code-Erkennung und Datei-Export.
 */

const LANG_EXT = {
  python: 'py',      py: 'py',
  javascript: 'js',  js: 'js',
  typescript: 'ts',  ts: 'ts',
  html: 'html',      css: 'css',
  java: 'java',      cpp: 'cpp',     c: 'c',
  bash: 'sh',        shell: 'sh',    sh: 'sh',
  json: 'json',      yaml: 'yml',    yml: 'yml',
  sql: 'sql',        rust: 'rs',     go: 'go',
  php: 'php',        ruby: 'rb',     swift: 'swift',
  kotlin: 'kt',      csharp: 'cs',   cs: 'cs',
  powershell: 'ps1', ps1: 'ps1',     bat: 'bat',
  xml: 'xml',        toml: 'toml',   ini: 'ini',
  r: 'r',            lua: 'lua',     dart: 'dart',
};

/**
 * Erkennt alle Code-Bloecke (```lang\ncode```) in einem Text.
 * @param {string} text
 * @returns {{ lang: string, code: string }[]}
 */
function detectCodeBlocks(text) {
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lang = match[1]?.toLowerCase().trim() || 'txt';
    const code = match[2].trim();
    if (code.length > 10) {
      blocks.push({ lang, code });
    }
  }
  return blocks;
}

/**
 * Dateiname fuer einen Code-Block.
 * @param {string} lang
 * @param {number} index
 */
function codeToFilename(lang, index = 0) {
  const ext = LANG_EXT[lang] || 'txt';
  return index === 0 ? `code.${ext}` : `code_${index + 1}.${ext}`;
}

/**
 * Entfernt Code-Bloecke aus Text (nur Erklaerung uebrig lassen).
 * @param {string} text
 */
function stripCodeBlocks(text) {
  return text
    .replace(/```(\w*)\n[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * MIME-Type fuer eine Sprache.
 * @param {string} lang
 */
function langToMimeType(lang) {
  const map = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    svg: 'image/svg+xml',
  };
  return map[lang] || 'text/plain';
}

module.exports = { detectCodeBlocks, codeToFilename, stripCodeBlocks, langToMimeType };
