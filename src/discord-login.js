/**
 * Discord Browser-Login via Chromium
 * Wird gestartet wenn kein Token in .env → öffnet Browser zur Anmeldung
 */
const { execFile } = require('child_process');
const fs   = require('fs');
const path = require('path');
const logger = require('./logger');

async function openDiscordLogin() {
  logger.info('🌐 Öffne Discord im Browser zum Anmelden...');

  // Chromium mit Discord öffnen
  const chromiumCandidates = [
    'chromium-browser', 'chromium', 'google-chrome',
    'google-chrome-stable', '/usr/bin/chromium-browser',
  ];

  const sessionDir = path.resolve('./sessions/discord-browser');
  fs.mkdirSync(sessionDir, { recursive: true });

  let launched = false;
  for (const cmd of chromiumCandidates) {
    try {
      execFile(cmd, [
        '--user-data-dir=' + sessionDir,
        '--app=https://discord.com/login',
        '--window-size=1000,700',
        '--no-first-run',
      ]);
      launched = true;
      logger.success(`Browser geöffnet: ${cmd}`);
      break;
    } catch {}
  }

  if (!launched) {
    // WSL: xdg-open oder manuell
    try {
      execFile('xdg-open', ['https://discord.com/login']);
      logger.info('xdg-open gestartet');
    } catch {
      logger.warn('Kein Browser gefunden. Bitte manuell öffnen: https://discord.com/login');
    }
  }

  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════╗');
  logger.info('║  Discord Login erforderlich:                          ║');
  logger.info('║  1. Melde dich im Browser bei Discord an             ║');
  logger.info('║  2. Öffne die Browser-Konsole (F12)                  ║');
  logger.info('║  3. Gib ein: copy(webpackChunkdiscord_app.push(      ║');
  logger.info('║     [[\'default\']], {}, e => {m=[];Object.keys(        ║');
  logger.info('║     e.c).forEach(c => {e.c[c].exports&&             ║');
  logger.info('║     e.c[c].exports.default&&                         ║');
  logger.info('║     e.c[c].exports.default.getToken&&                ║');
  logger.info('║     m.push(e.c[c].exports.default.getToken())}      ║');
  logger.info('║     );console.log(m[0])})                            ║');
  logger.info('║  4. Der Token ist in der Zwischenablage              ║');
  logger.info('║  5. Eintragen in .env: DISCORD_TOKEN=dein_token      ║');
  logger.info('║  6. npm start neu starten                            ║');
  logger.info('╚══════════════════════════════════════════════════════╝');
  logger.info('');
  logger.info('ODER: Bot-Token erstellen auf https://discord.com/developers/applications');
}

module.exports = { openDiscordLogin };
