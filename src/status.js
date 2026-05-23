const os = require('os');
const { execSync } = require('child_process');

/**
 * Liest CPU-Auslastung über /proc/stat (Linux/WSL).
 */
async function getCpuUsage() {
  return new Promise((resolve) => {
    try {
      // Zwei Messungen mit 500ms Abstand für genaue CPU-Last
      const read = () => {
        const stat = require('fs').readFileSync('/proc/stat', 'utf-8');
        const line = stat.split('\n')[0].split(/\s+/);
        const user   = parseInt(line[1]);
        const nice   = parseInt(line[2]);
        const system = parseInt(line[3]);
        const idle   = parseInt(line[4]);
        const iowait = parseInt(line[5]);
        const total  = user + nice + system + idle + iowait;
        return { idle, total };
      };

      const before = read();
      setTimeout(() => {
        const after = read();
        const idleDelta  = after.idle  - before.idle;
        const totalDelta = after.total - before.total;
        const usage = Math.round((1 - idleDelta / totalDelta) * 100);
        resolve(Math.max(0, Math.min(100, usage)));
      }, 500);
    } catch {
      // Fallback für Systeme ohne /proc/stat
      const cpus = os.cpus();
      let totalIdle = 0, totalTick = 0;
      for (const cpu of cpus) {
        for (const type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
      }
      resolve(Math.round((1 - totalIdle / totalTick) * 100));
    }
  });
}

/**
 * RAM-Info aus /proc/meminfo oder os.totalmem.
 */
function getMemoryInfo() {
  try {
    const meminfo = require('fs').readFileSync('/proc/meminfo', 'utf-8');
    const getValue = (key) => {
      const match = meminfo.match(new RegExp(`${key}:\\s+(\\d+)`));
      return match ? parseInt(match[1]) * 1024 : 0; // kB → Bytes
    };
    const total     = getValue('MemTotal');
    const available = getValue('MemAvailable');
    const used      = total - available;
    return { total, used, available, percent: Math.round((used / total) * 100) };
  } catch {
    const total = os.totalmem();
    const free  = os.freemem();
    const used  = total - free;
    return { total, used, available: free, percent: Math.round((used / total) * 100) };
  }
}

/**
 * Ollama-Status prüfen.
 */
async function getOllamaStatus() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { running: false };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    return { running: true, models };
  } catch {
    return { running: false };
  }
}

/**
 * Formatiert Bytes lesbar.
 */
function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Erstellt einen ASCII-Fortschrittsbalken.
 */
function bar(percent, width = 10) {
  const filled = Math.round((percent / 100) * width);
  const empty  = width - filled;
  const color  = percent > 85 ? '🔴' : percent > 60 ? '🟡' : '🟢';
  return `${color} [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

/**
 * Generiert die vollständige Status-Nachricht.
 */
async function getStatusMessage() {
  const [cpuUsage, memory, ollama] = await Promise.all([
    getCpuUsage(),
    Promise.resolve(getMemoryInfo()),
    getOllamaStatus(),
  ]);

  const uptime = process.uptime();
  const uptimeStr = uptime > 3600
    ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
    : `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`;

  const osUptime = os.uptime();
  const osUptimeStr = osUptime > 86400
    ? `${Math.floor(osUptime / 86400)}d ${Math.floor((osUptime % 86400) / 3600)}h`
    : `${Math.floor(osUptime / 3600)}h ${Math.floor((osUptime % 3600) / 60)}m`;

  const cpuModel = os.cpus()[0]?.model?.trim() || 'Unbekannt';
  const cpuCores = os.cpus().length;

  let msg = `*🤖 Cotti System – Status*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `*💻 CPU*\n`;
  msg += `${bar(cpuUsage)}\n`;
  msg += `_${cpuModel} (${cpuCores} Kerne)_\n\n`;

  msg += `*🧠 RAM*\n`;
  msg += `${bar(memory.percent)}\n`;
  msg += `_${formatBytes(memory.used)} / ${formatBytes(memory.total)} genutzt_\n\n`;

  msg += `*🤖 Cotti-System's AI*\n`;
  if (ollama.running) {
    msg += `🟢 Läuft\n`;
  } else {
    msg += `🔴 Nicht erreichbar\n`;
  }
  msg += `\n`;

  msg += `*⏱️ Laufzeiten*\n`;
  msg += `Bot: _${uptimeStr}_ | System: _${osUptimeStr}_\n`;

  return msg;
}

module.exports = { getStatusMessage };
