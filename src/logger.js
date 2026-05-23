const colors = {
  reset: '\x1b[0m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  success: '\x1b[32m',
};

function timestamp() {
  return new Date().toLocaleString('de-DE');
}

module.exports = {
  info: (msg) => console.log(`${colors.info}[${timestamp()}] INFO${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.warn}[${timestamp()}] WARN${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.error}[${timestamp()}] ERROR${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.success}[${timestamp()}] OK${colors.reset}    ${msg}`),
};
