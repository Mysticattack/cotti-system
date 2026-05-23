const config = require('../config');
const logger = require('./logger');

// Chatverlauf pro Konversation speichern (key = chatId)
const chatHistories = new Map();
const sessionTimestamps = new Map();
const HISTORY_TTL = 24 * 60 * 60 * 1000; // 24 Stunden
const MAX_SESSIONS = 1000;
const REQUEST_TIMEOUT = 30000; // 30 Sekunden

/**
 * Sendet eine Nachricht an Ollama und gibt die Antwort zurück.
 * @param {string} chatId - Eindeutige ID der Konversation
 * @param {string} userMessage - Die aktuelle Nachricht des Users
 * @param {string} platform - 'whatsapp' oder 'discord'
 * @returns {Promise<string>} - Antwort von Ollama
 */
async function askOllama(chatId, userMessage, platform = 'unknown') {
  // Chatverlauf holen oder neu erstellen
  if (!chatHistories.has(chatId)) {
    chatHistories.set(chatId, []);
  }
  const history = chatHistories.get(chatId);

  // System-Prompt
  const systemPrompt = `Du bist ein hilfreicher KI-Assistent namens "Cotti System". 
Du antwortest auf Nachrichten auf der Plattform: ${platform}.
Antworte immer in der gleichen Sprache wie der User.
Sei freundlich, direkt und hilfreich.
Halte Antworten angemessen kurz für Chat-Nachrichten.`;

  // Aktuelle Nachricht zum Verlauf hinzufügen
  history.push({ role: 'user', content: userMessage });

  // Nur die letzten N Nachrichten mitschicken (Kontext-Limit)
  const recentHistory = history.slice(-config.ollama.contextMessages);

  try {
    const response = await fetch(`${config.ollama.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollama.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const assistantReply = data.message?.content || 'Keine Antwort von Ollama erhalten.';

    // Antwort zum Verlauf hinzufügen
    history.push({ role: 'assistant', content: assistantReply });

    // Verlauf kürzen damit RAM nicht explodiert
    if (history.length > config.ollama.contextMessages * 2) {
      history.splice(0, 2);
    }

    logger.success(`Ollama geantwortet (${chatId.substring(0, 20)}...)`);
    return assistantReply;
  } catch (err) {
    logger.error(`Ollama Fehler: ${err.message}`);
    throw err;
  }
}

/**
 * Chatverlauf für eine bestimmte Konversation löschen.
 */
function clearHistory(chatId) {
  chatHistories.delete(chatId);
  logger.info(`Verlauf gelöscht für: ${chatId}`);
}

module.exports = { askOllama, clearHistory };
