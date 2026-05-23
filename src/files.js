const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('../config');

/**
 * Listet alle Dateien im Share-Ordner auf.
 */
function listSharedFiles() {
  const dir = config.files.shareFolder;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return [];
  }

  return fs.readdirSync(dir)
    .filter(f => !f.startsWith('.'))
    .map(f => ({
      name: f,
      path: path.join(dir, f),
      size: fs.statSync(path.join(dir, f)).size,
      ext: path.extname(f).toLowerCase(),
    }));
}

/**
 * Sucht eine Datei im Share-Ordner anhand eines Suchbegriffs.
 */
function findFile(query) {
  const files = listSharedFiles();
  const q = query.toLowerCase();
  return files.find(f => f.name.toLowerCase().includes(q)) || null;
}

/**
 * Prüft ob die Nachricht eine Dateianfrage enthält.
 * Gibt den Dateinamen/Begriff zurück oder null.
 */
function extractFileIntent(text) {
  const patterns = [
    /schick\s+(?:mir\s+)?(?:die\s+|das\s+|den\s+)?(?:datei|pdf|bild|foto|dokument)\s+[""']?([^""']+)[""']?/i,
    /(?:hast\s+du\s+(?:die\s+|eine?\s+)?)?datei\s+[""']?([^""'?\n]+)[""']?/i,
    /(?:schick|send|sende)\s+(?:mir\s+)?[""']([^""']+)[""']/i,
    /(?:kannst\s+du\s+)?(?:mir\s+)?([^\s]+\.(?:pdf|docx?|xlsx?|png|jpe?g|gif|mp3|mp4|zip|txt))\s+schicken/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Gibt eine lesbare Dateiliste zurück.
 */
function formatFileList() {
  const files = listSharedFiles();
  if (files.length === 0) {
    return `📁 Der Datei-Ordner ist leer.\nDateien ablegen unter: ${config.files.shareFolder}`;
  }

  const icons = {
    '.pdf': '📄', '.doc': '📝', '.docx': '📝',
    '.xls': '📊', '.xlsx': '📊',
    '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️',
    '.mp3': '🎵', '.mp4': '🎬', '.ogg': '🎵',
    '.zip': '🗜️', '.txt': '📃',
  };

  let msg = `📁 *Verfügbare Dateien (${files.length}):*\n\n`;
  files.forEach(f => {
    const icon = icons[f.ext] || '📎';
    const size = f.size > 1024 * 1024
      ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(f.size / 1024)} KB`;
    msg += `${icon} ${f.name} _(${size})_\n`;
  });
  msg += `\nSag mir welche Datei du möchtest!`;
  return msg;
}

module.exports = { listSharedFiles, findFile, extractFileIntent, formatFileList };
