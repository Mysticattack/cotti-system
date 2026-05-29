/**
 * Dynamische Blockliste – persistent in data/blocklist.json gespeichert.
 * Wird automatisch neu geladen wenn die Datei gespeichert wird (kein Neustart noetig).
 *
 * Format der Datei:
 * {
 *   "discord":  ["123456789012345678", "987654321098765432"],
 *   "whatsapp": ["4915123456789", "4916200000000"]
 * }
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'blocklist.json');

let data = { discord: [], whatsapp: [] };

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      data.discord = Array.isArray(parsed.discord) ? parsed.discord.map(String) : [];
      data.whatsapp = Array.isArray(parsed.whatsapp) ? parsed.whatsapp.map(String) : [];
      logger.info(`Blockliste geladen: ${data.discord.length} Discord, ${data.whatsapp.length} WhatsApp`);
    }
  } catch (err) {
    logger.warn(`Blockliste konnte nicht geladen werden: ${err.message}`);
  }
}

function save() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logger.warn(`Blockliste konnte nicht gespeichert werden: ${err.message}`);
  }
}

// Initiales Laden
load();

// Datei-Watcher: automatisch neu laden wenn blocklist.json geaendert wird
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  // Datei anlegen falls sie noch nicht existiert
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ discord: [], whatsapp: [] }, null, 2), 'utf8');
  }
  fs.watch(FILE, (eventType) => {
    if (eventType === 'change') {
      setTimeout(() => {
        load();
        logger.success('Blockliste automatisch neu geladen (Dateiänderung erkannt)');
      }, 200);
    }
  });
  logger.info(`Blockliste wird beobachtet: ${FILE}`);
} catch (err) {
  logger.warn(`Blockliste-Watcher konnte nicht gestartet werden: ${err.message}`);
}

/**
 * Prueft ob eine ID blockiert ist (dynamisch + statische Config).
 * @param {'discord'|'whatsapp'} platform
 * @param {string} id
 * @param {string[]} staticList  config.discord.blocklist oder config.whatsapp.blocklist
 */
function isBlocked(platform, id, staticList = []) {
  return staticList.includes(id) || data[platform].includes(id);
}

/**
 * Fuegt eine ID zur dynamischen Blockliste hinzu.
 * @param {'discord'|'whatsapp'} platform
 * @param {string} id
 * @returns {boolean} true wenn neu hinzugefuegt, false wenn bereits vorhanden
 */
function block(platform, id) {
  if (data[platform].includes(id)) return false;
  data[platform].push(id);
  save();
  logger.info(`Blockliste [${platform}]: ${id} hinzugefuegt`);
  return true;
}

/**
 * Entfernt eine ID aus der dynamischen Blockliste.
 * @param {'discord'|'whatsapp'} platform
 * @param {string} id
 * @returns {boolean} true wenn entfernt, false wenn nicht gefunden
 */
function unblock(platform, id) {
  const idx = data[platform].indexOf(id);
  if (idx === -1) return false;
  data[platform].splice(idx, 1);
  save();
  logger.info(`Blockliste [${platform}]: ${id} entfernt`);
  return true;
}

/**
 * Gibt alle dynamisch blockierten IDs zurueck.
 * @param {'discord'|'whatsapp'} platform
 */
function list(platform) {
  return [...data[platform]];
}

module.exports = { isBlocked, block, unblock, list };
