/**
 * Away-Modus Manager fuer Cotti System.
 * /abwesend -all/-dc/-wh [-time <min>] [off]
 */

const logger = require('./logger');

const state = {
  discord: false,
  whatsapp: false,
  startedAt: { discord: null, whatsapp: null },
  timers: {},
};

const HEADER = `===========================
     Cotti System v1.0
===========================`;

const FOOTER = `---------------------------
\u00a9 Cotti System
===========================`;

const INFO_BLOCK = `---------------------------
Systeminformationen:
Inhaber: cott@cott-i.de
Support: support@cott-i.de
Sekretaer: nicht vergeben
---------------------------`;

/**
 * Erstellt die Standard-Abwesenheitsnachricht.
 */
function getAwayMessage() {
  const now = new Date().toLocaleTimeString('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${HEADER}

\uD83D\uDCE8 Abwesenheitsnotiz
${INFO_BLOCK}
Vielen Dank fuer Ihre Nachricht!

Ich bin derzeit offline und
nicht erreichbar. Ich werde
mich schnellstmoeglich bei
Ihnen zurueckmelden.

\u23F1 Automatisch gesendet um
${now} Uhr via Autobot
${FOOTER}`;
}

/**
 * Status-Nachricht fuer Nicht-Owner: zeigt wann Away aktiviert wurde.
 * @param {'discord'|'whatsapp'} platform
 */
function getStatusMessage(platform) {
  const now = new Date().toLocaleTimeString('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  });
  const since = state.startedAt[platform];
  const sinceStr = since
    ? since.toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' Uhr'
    : 'unbekannt';

  return `${HEADER}

\uD83D\uDCE8 Abwesenheitsnotiz
${INFO_BLOCK}
\u26A0\uFE0F Offline \u00B7 System an seit:
${sinceStr}

\u23F1 Automatisch gesendet um
${now} Uhr via Autobot
${FOOTER}`;
}

/**
 * Gibt zurueck ob Away-Modus fuer eine Plattform aktiv ist.
 */
function isAway(platform) {
  return state[platform] === true;
}

/**
 * Setzt den Away-Modus.
 * @param {'all'|'discord'|'whatsapp'} platform
 * @param {boolean} enabled
 */
function setAway(platform, enabled) {
  const platforms = platform === 'all' ? ['discord', 'whatsapp'] : [platform];
  for (const p of platforms) {
    state[p] = enabled;
    state.startedAt[p] = enabled ? new Date() : null;
  }
  logger.info(`Away-Modus [${platform}] -> ${enabled ? 'AN' : 'AUS'}`);
}

/**
 * Plant Away-Aktivierung in X Minuten.
 * @param {'all'|'discord'|'whatsapp'} platform
 * @param {number} minutes
 */
function scheduleAway(platform, minutes) {
  if (state.timers[platform]) {
    clearTimeout(state.timers[platform]);
    delete state.timers[platform];
  }
  state.timers[platform] = setTimeout(() => {
    setAway(platform, true);
    delete state.timers[platform];
    logger.info(`Away-Timer abgelaufen: [${platform}] jetzt AN`);
  }, minutes * 60 * 1000);
  logger.info(`Away-Timer gesetzt: ${minutes} Min. [${platform}]`);
}

/**
 * Bricht laufende Away-Timer ab.
 * @param {'all'|'discord'|'whatsapp'} platform
 */
function cancelSchedule(platform) {
  const keys = platform === 'all' ? ['all', 'discord', 'whatsapp'] : [platform];
  for (const k of keys) {
    if (state.timers[k]) {
      clearTimeout(state.timers[k]);
      delete state.timers[k];
      logger.info(`Away-Timer abgebrochen [${k}]`);
    }
  }
}

/**
 * Parst einen /abwesend Befehl.
 * @returns {{ platform: string, off: boolean, time: number|null }|null}
 */
function parseAwayCommand(text) {
  const lower = text.trim().toLowerCase();
  if (!lower.startsWith('/abwesend')) return null;

  const parts = lower.split(/\s+/);
  let platform = null;
  let off = false;
  let time = null;

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (p === '-all') platform = 'all';
    else if (p === '-dc' || p === '-discord') platform = 'discord';
    else if (p === '-wh' || p === '-whatsapp') platform = 'whatsapp';
    else if (p === 'off' || p === '-off') off = true;
    else if ((p === '-time' || p === '-t') && parts[i + 1]) {
      const t = parseInt(parts[i + 1]);
      if (!isNaN(t) && t > 0) { time = t; i++; }
    }
  }

  if (!platform && !off) return null;
  if (!platform) platform = 'all';
  return { platform, off, time };
}

module.exports = {
  isAway,
  setAway,
  scheduleAway,
  cancelSchedule,
  parseAwayCommand,
  getAwayMessage,
  getStatusMessage,
};
