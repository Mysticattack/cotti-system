const { Client, MessageAttachment } = require('discord.js-selfbot-v13');
const fs = require('fs');
const config = require('../config');
const { askOllama } = require('./ollama');
const { webSearch, shouldSearch, buildSearchContext } = require('./search');
const { downloadYouTubeAudio, downloadYouTubeVideo, searchMyInstants, downloadMyInstant, extractDownloadIntent } = require('./downloader');
const { openDiscordLogin } = require('./discord-login');
const { isAway, setAway, scheduleAway, cancelSchedule, parseAwayCommand, getAwayMessage, getStatusMessage } = require('./away');
const blocklistMgr = require('./blocklist');
const { detectCodeBlocks, codeToFilename, stripCodeBlocks } = require('./code-utils');
const logger = require('./logger');

const MAX_MESSAGE_LENGTH = 2000;
const pendingSoundSelections = new Map();

function startDiscord() {
  if (!config.discord.token) {
    openDiscordLogin();
    logger.error('Discord wird nicht gestartet bis DISCORD_TOKEN in .env eingetragen ist.');
    return;
  }

  const client = new Client({ checkUpdate: false });

  client.once('ready', () => {
    logger.success(`Discord verbunden als: ${client.user.tag}`);
    client.user.setActivity('Cotti System', { type: 'WATCHING' });
  });

  client.on('messageCreate', async (message) => {
    try {
      await handleDiscordMessage(client, message);
    } catch (err) {
      logger.error(`Fehler bei Discord-Nachricht: ${err.message}`);
    }
  });

  client.login(config.discord.token).catch((err) => {
    logger.error('Discord Login fehlgeschlagen – Token ungueltig oder abgelaufen.');
    logger.warn('Neuen Token holen: npm start zeigt die Anleitung wenn DISCORD_TOKEN leer ist.');
    logger.warn(`Fehlercode: ${err.code || err.message || 'unbekannt'}`);
  });
  logger.info('Discord wird initialisiert...');
}

async function handleDiscordMessage(client, message) {
  // Eigene Nachrichten und andere Bots ignorieren
  if (!message.author) return;
  if (message.author.id === client.user?.id) return;
  if (message.author.bot) return;

  const userId = message.author.id;
  const isDM = message.channel.type === 'DM';
  const isMention = message.mentions.has(client.user);
  const chatId = isDM ? `discord_dm_${userId}` : `discord_ch_${message.channel.id}`;

  // Blockliste pruefen (statisch + dynamisch)
  if (blocklistMgr.isBlocked('discord', userId, config.discord.blocklist)) {
    logger.info(`Ignoriere blockierten Discord User: ${userId}`);
    return;
  }

  // Nur auf DMs oder Mentions reagieren
  const shouldRespond =
    (isDM && config.discord.respondToDMs) ||
    (isMention && config.discord.respondToMentions);

  if (!shouldRespond) return;

  // Nachrichtentext bereinigen (Bot-Mention entfernen)
  let userText = message.content
    .replace(/<@!?[\d]+>/g, '')
    .trim();

  if (!userText || userText === '') {
    userText = '(leere Nachricht)';
  }

  // Nachrichtenlaenge begrenzen (DoS-Schutz)
  if (userText.length > MAX_MESSAGE_LENGTH) {
    userText = userText.substring(0, MAX_MESSAGE_LENGTH);
    await message.reply(`Nachricht auf ${MAX_MESSAGE_LENGTH} Zeichen gekuerzt.` + config.footer);
  }

  // /block und /unblock Befehle (Owner only)
  const blockMatch = userText.match(/^\/block\s+(\S+)/i);
  const unblockMatch = userText.match(/^\/unblock\s+(\S+)/i);
  if (blockMatch || unblockMatch) {
    const isOwner = config.owner?.discordId && userId === config.owner.discordId;
    if (!isOwner) { await message.reply('Nur der Owner kann die Blockliste verwalten.'); return; }
    if (blockMatch) {
      const targetId = blockMatch[1];
      const added = blocklistMgr.block('discord', targetId);
      await message.reply(added ? `\u2705 ${targetId} zur Blockliste hinzugefuegt.` : `${targetId} ist bereits blockiert.`);
    } else {
      const targetId = unblockMatch[1];
      const removed = blocklistMgr.unblock('discord', targetId);
      await message.reply(removed ? `\u2705 ${targetId} von der Blockliste entfernt.` : `${targetId} war nicht blockiert.`);
    }
    return;
  }

  // /blocklist Befehl (Owner only)
  if (/^\/blocklist\b/i.test(userText)) {
    const isOwner = config.owner?.discordId && userId === config.owner.discordId;
    if (!isOwner) { await message.reply('Nur der Owner kann die Blockliste einsehen.'); return; }
    const dynamic = blocklistMgr.list('discord');
    const stat = config.discord.blocklist || [];
    const all = [...new Set([...stat, ...dynamic])];
    await message.reply(all.length > 0
      ? `Blockierte Accounts (${all.length}):\n${all.map((id, i) => `${i + 1}. ${id}${dynamic.includes(id) ? '' : ' (config)'}`).join('\n')}`
      : 'Keine Accounts blockiert.');
    return;
  }

  // /hilfe Befehl
  if (/^\/hilfe\b/i.test(userText) || /^!hilfe\b/i.test(userText) || /^!help\b/i.test(userText)) {
    const isOwner = config.owner?.discordId && userId === config.owner.discordId;
    await message.reply([
      '```',
      '=== Cotti System – Befehle ===',
      '',
      '-- Abwesenheit (nur Owner) --',
      '/abwesend -all          Alle Plattformen an',
      '/abwesend -dc           Nur Discord an',
      '/abwesend -wh           Nur WhatsApp an',
      '/abwesend -all -time 20 In 20 Min aktivieren',
      '/abwesend off           Deaktivieren',
      '',
      '-- Abwesenheit (jeder) --',
      '/abwesend               Status (wann aktiv seit)',
      '',
      '-- Blockliste (nur Owner) --',
      '/block <UserID>         Account blockieren',
      '/unblock <UserID>       Account entsperren',
      '/blocklist              Alle blockierten Accounts',
      '',
      '-- Downloads --',
      '!yt <YouTube-URL>       Audio als MP3',
      '!yt-video <URL>         Video als MP4',
      '!sound <Begriff>        Sound suchen (5 Treffer)',
      '',
      '-- KI / Generierung --',
      'Einfach schreiben       KI-Chat (Ollama)',
      'Erstelle ein Bild von … Bildgenerierung',
      'Erstelle ein Video von … Videogenerierung',
      '',
      isOwner ? '(Du bist als Owner erkannt)' : '(Owner-Befehle benoetigen OWNER_DISCORD_ID in .env)',
      '```',
    ].join('\n'));
    return;
  }

  // /abwesend Befehl
  const awayCmd = parseAwayCommand(userText);
  if (awayCmd) {
    const isOwner = config.owner?.discordId && userId === config.owner.discordId;
    if (!isOwner) {
      await message.reply(isAway('discord') ? getStatusMessage('discord') : 'Kein Away-Modus aktiv.');
      return;
    }
    if (awayCmd.off) {
      setAway(awayCmd.platform, false);
      cancelSchedule(awayCmd.platform);
      await message.reply(`Away-Modus deaktiviert (${awayCmd.platform}).`);
    } else if (awayCmd.time) {
      scheduleAway(awayCmd.platform, awayCmd.time);
      await message.reply(`Away-Modus wird in ${awayCmd.time} Minuten aktiviert (${awayCmd.platform}).`);
    } else {
      setAway(awayCmd.platform, true);
      await message.reply(`Away-Modus aktiviert (${awayCmd.platform}).`);
    }
    return;
  }

  // Away-Modus aktiv -> Abwesenheitsnachricht senden
  if (isAway('discord')) {
    await message.reply(getAwayMessage());
    return;
  }

  logger.info(`Discord-Nachricht von ${message.author.tag} (${isDM ? 'DM' : 'Mention'})`);

  // Chatverlauf aus Discord Channel laden (letzte Nachrichten als Kontext)
  let contextPrefix = '';
  if (!isDM) {
    try {
      const fetched = await message.channel.messages.fetch({ limit: 8, before: message.id });
      const history = [...fetched.values()]
        .reverse()
        .map((m) => {
          const who = m.author.bot ? 'Assistent' : m.author.username;
          return `${who}: ${m.content.replace(/<@!?[\d]+>/g, '').trim()}`;
        })
        .filter((line) => line.includes(': ') && !line.endsWith(': '))
        .join('\n');

      if (history) {
        contextPrefix = `[Vorheriger Chatverlauf]\n${history}\n\n[Aktuelle Nachricht]\n`;
      }
    } catch (err) {
      logger.warn(`Discord Chatverlauf konnte nicht geladen werden: ${err.message}`);
    }
  }

  // Pending Sound-Auswahl: User hat Zahl 1-5 eingegeben
  const pendingSound = pendingSoundSelections.get(chatId);
  if (pendingSound) {
    if (Date.now() > pendingSound.expiresAt) {
      pendingSoundSelections.delete(chatId);
    } else {
      const choice = parseInt(userText.trim());
      if (!isNaN(choice) && choice >= 1 && choice <= pendingSound.results.length) {
        pendingSoundSelections.delete(chatId);
        await message.channel.sendTyping();
        const picked = pendingSound.results[choice - 1];
        try {
          const soundPath = await downloadMyInstant(picked.soundUrl, picked.name);
          if (!soundPath) { await message.reply('Sound-Download fehlgeschlagen.' + config.footer); return; }
          await message.channel.send({
            content: `\uD83D\uDD0A **${picked.name}**${config.footer}`,
            files: [new MessageAttachment(soundPath, `${picked.name}.mp3`)],
          });
          try { fs.unlinkSync(soundPath); } catch (_) {}
          logger.success(`Discord Sound gesendet: ${picked.name}`);
        } catch (err) {
          await message.reply(`Sound-Download fehlgeschlagen: ${err.message}`);
        }
        return;
      } else {
        pendingSoundSelections.delete(chatId);
      }
    }
  }

  // Download-Anfrage erkennen (!yt, !yt-video, !sound + natuerliche Sprache)
  const downloadIntent = extractDownloadIntent(userText);
  if (downloadIntent) {
    await message.channel.sendTyping();
    try {
      if (downloadIntent.type === 'yt-audio') {
        logger.info(`Discord YT-Audio von ${message.author.tag}: ${downloadIntent.query}`);
        const notice = await message.reply('⏳ Lade YouTube-Audio herunter...');
        const result = await downloadYouTubeAudio(downloadIntent.query);
        await message.channel.send({
          content: `🎵 **${result.title}**${config.footer}`,
          files: [new MessageAttachment(result.path, `${result.title}.mp3`)],
        });
        try { fs.unlinkSync(result.path); } catch (_) {}
        try { await notice.delete(); } catch (_) {}
        logger.success(`Discord YT-Audio gesendet an ${message.author.tag}`);
        return;
      }
      if (downloadIntent.type === 'yt-video') {
        logger.info(`Discord YT-Video von ${message.author.tag}: ${downloadIntent.query}`);
        const notice = await message.reply('⏳ Lade YouTube-Video herunter...');
        const result = await downloadYouTubeVideo(downloadIntent.query);
        const stat = fs.statSync(result.path);
        if (stat.size > 25 * 1024 * 1024) {
          await message.reply(`Video zu groß fuer Discord (${(stat.size / 1024 / 1024).toFixed(1)} MB > 25 MB).`);
          try { fs.unlinkSync(result.path); } catch (_) {}
        } else {
          await message.channel.send({
            content: `🎬 **${result.title}**${config.footer}`,
            files: [new MessageAttachment(result.path, `${result.title}.mp4`)],
          });
          try { fs.unlinkSync(result.path); } catch (_) {}
        }
        try { await notice.delete(); } catch (_) {}
        logger.success(`Discord YT-Video gesendet an ${message.author.tag}`);
        return;
      }
      if (downloadIntent.type === 'sound') {
        logger.info(`Discord Myinstants von ${message.author.tag}: ${downloadIntent.query}`);
        const results = await searchMyInstants(downloadIntent.query);
        if (results.length === 0) {
          await message.reply(`Kein Sound fuer "${downloadIntent.query}" gefunden.` + config.footer);
          return;
        }
        const list = results.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
        pendingSoundSelections.set(chatId, { results, expiresAt: Date.now() + 60000 });
        await message.reply(`\uD83D\uDD0A **${results.length} Treffer fuer "${downloadIntent.query}":**\n${list}\n\nNummer eingeben (1\u2013${results.length}):`);
        return;
      }
    } catch (err) {
      logger.error(`Discord Download fehlgeschlagen: ${err.message}`);
      await message.reply(`Download fehlgeschlagen: ${err.message}`);
      return;
    }
  }

  const fullPrompt = contextPrefix + userText;

  // "Schreibt..." anzeigen
  await message.channel.sendTyping();

  // Alle 8 Sekunden "tippt" erneuern waehrend Ollama antwortet
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().catch(() => {});
  }, 8000);

  // Web-Suche vor Ollama-Aufruf (kein API-Key noetig, via DuckDuckGo)
  let searchContext = null;
  if (config.search?.enabled !== false && shouldSearch(userText)) {
    const results = await webSearch(userText);
    searchContext = buildSearchContext(results);
  }

  try {
    const reply = await askOllama(chatId, fullPrompt, 'Discord', searchContext);

    const codeBlocks = detectCodeBlocks(reply);
    if (codeBlocks.length > 0) {
      const explanation = stripCodeBlocks(reply);
      if (explanation) {
        const chunks = splitMessage(explanation + config.footer, 1990);
        for (const chunk of chunks) { await message.reply(chunk); }
      }
      for (let i = 0; i < codeBlocks.length; i++) {
        const { lang, code } = codeBlocks[i];
        await message.channel.send({
          files: [new MessageAttachment(Buffer.from(code, 'utf8'), codeToFilename(lang, i))],
        });
      }
    } else {
      const chunks = splitMessage(reply + config.footer, 1990);
      for (const chunk of chunks) { await message.reply(chunk); }
    }

    logger.success(`Discord geantwortet an ${message.author.tag}`);
  } finally {
    clearInterval(typingInterval);
  }
}

/**
 * Teilt lange Nachrichten in Discord-konforme Chunks auf.
 */
function splitMessage(text, maxLength = 1990) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    if (current.length + line.length + 1 > maxLength) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = { startDiscord };
