const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const logger = require('./logger');

/**
 * Transkribiert eine Audiodatei mit Whisper CLI.
 * @param {Buffer} audioBuffer - Rohe Audio-Bytes (ogg/mp3/wav)
 * @param {string} ext - Dateiendung z.B. '.ogg'
 * @returns {Promise<string>} - Transkribierter Text
 */
async function transcribeAudio(audioBuffer, ext = '.ogg') {
  const tmpFile = path.join(os.tmpdir(), `cotti_voice_${Date.now()}${ext}`);
  const outBase = tmpFile.replace(ext, '');

  try {
    // Temporäre Audiodatei speichern
    fs.writeFileSync(tmpFile, audioBuffer);

    // Whisper aufrufen
    const text = await new Promise((resolve, reject) => {
      execFile(
        'whisper',
        [
          tmpFile,
          '--model', config.whatsapp.whisperModel,
          '--output_format', 'txt',
          '--output_dir', os.tmpdir(),
          '--language', 'auto', // Sprache automatisch erkennen
        ],
        { timeout: 60000 },
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(`Whisper Fehler: ${err.message}\n${stderr}`));
            return;
          }
          // Whisper schreibt Output in <tmpFile>.txt
          const txtPath = `${outBase}.txt`;
          if (fs.existsSync(txtPath)) {
            const result = fs.readFileSync(txtPath, 'utf-8').trim();
            fs.unlinkSync(txtPath);
            resolve(result);
          } else {
            reject(new Error('Whisper hat keine Ausgabedatei erzeugt.'));
          }
        }
      );
    });

    logger.success(`Sprachnachricht transkribiert: "${text.substring(0, 50)}..."`);
    return text;
  } finally {
    // Aufräumen
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

module.exports = { transcribeAudio };
