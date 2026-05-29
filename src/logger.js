const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  success: '\x1b[32m',
};

const LOG_DIR = path.join(__dirname, '..', 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logFilePath() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(LOG_DIR, `cotti-${date}.log`);
}

function writeToFile(level, msg) {
  try {
    ensureLogDir();
    const ts = new Date().toLocaleString('de-DE');
    fs.appendFileSync(logFilePath(), `[${ts}] ${level.padEnd(5)} ${msg}\n`, 'utf8');
  } catch (_) {}
}

function timestamp() {
  return new Date().toLocaleString('de-DE');
}

module.exports = {
  info: (msg) => {
    console.log(`${colors.info}[${timestamp()}] INFO${colors.reset}  ${msg}`);
    writeToFile('INFO', msg);
  },
  warn: (msg) => {
    console.log(`${colors.warn}[${timestamp()}] WARN${colors.reset}  ${msg}`);
    writeToFile('WARN', msg);
  },
  error: (msg) => {
    console.log(`${colors.error}[${timestamp()}] ERROR${colors.reset} ${msg}`);
    writeToFile('ERROR', msg);
  },
  success: (msg) => {
    console.log(`${colors.success}[${timestamp()}] OK${colors.reset}    ${msg}`);
    writeToFile('OK', msg);
  },
};
