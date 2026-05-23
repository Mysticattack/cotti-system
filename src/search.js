const logger = require('./logger');

/**
 * Durchsucht das Web nach Links zu einem Thema.
 * Nutzt DuckDuckGo HTML (kein API-Key nötig).
 * Gibt Array von { title, url, snippet } zurück.
 */
async function webSearch(query, maxResults = 3) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CottiBot/1.0)',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // Ergebnisse aus DuckDuckGo HTML parsen
    const results = [];
    const linkRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const snippetRegex = /class="result__snippet"[^>]*>([^<]+)</g;

    let linkMatch, snippetMatch;
    const links = [];
    const snippets = [];

    while ((linkMatch = linkRegex.exec(html)) !== null) {
      links.push({ url: linkMatch[1], title: linkMatch[2].trim() });
    }
    while ((snippetMatch = snippetRegex.exec(html)) !== null) {
      snippets.push(snippetMatch[1].trim());
    }

    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || '',
      });
    }

    logger.success(`Websuche "${query}": ${results.length} Ergebnisse`);
    return results;
  } catch (err) {
    logger.error(`Websuche fehlgeschlagen: ${err.message}`);
    return [];
  }
}

/**
 * Prüft ob eine Nachricht eine Suchanfrage enthält.
 * Gibt den Suchbegriff zurück oder null.
 */
function extractSearchIntent(text) {
  const patterns = [
    /(?:such|find|zeig|schick|gibt es|hast du|kannst du (?:mir )?(?:einen?|ein)?)\s+(?:mir\s+)?(?:einen?\s+)?(?:link|rezept|video|artikel|seite|website)\s+(?:für|zu|über|von)?\s+(.+)/i,
    /(?:rezept\s+für|rezept\s+von)\s+(.+)/i,
    /(?:link\s+(?:zu|für|von))\s+(.+)/i,
    /(?:youtube|video)\s+(?:über|zu|von)\s+(.+)/i,
    /(?:wie\s+macht\s+man|wie\s+kocht\s+man|wie\s+backt\s+man)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Prüft ob jemand eine Sprachantwort möchte.
 */
function wantsVoiceReply(text) {
  const voicePatterns = [
    /schick\s+(?:mir\s+)?(?:eine\s+)?sprachnachricht/i,
    /antworte?\s+(?:mir\s+)?(?:per|als|mit)\s+(?:sprache|sprachnachricht|audio|voice)/i,
    /sag\s+(?:mir\s+)?(?:das\s+)?(?:mal\s+)?laut/i,
    /kannst\s+du\s+(?:mir\s+)?(?:das\s+)?vorlesen/i,
    /sprich\s+(?:das\s+)?(?:mal\s+)?aus/i,
  ];
  return voicePatterns.some(p => p.test(text));
}

/**
 * Formatiert Suchergebnisse als lesbare Nachricht.
 */
function formatSearchResults(results, query) {
  if (results.length === 0) {
    return `Ich habe leider keine Ergebnisse für "${query}" gefunden.`;
  }

  let msg = `🔍 *Suchergebnisse für "${query}":*\n\n`;
  results.forEach((r, i) => {
    msg += `${i + 1}. *${r.title}*\n`;
    if (r.snippet) msg += `_${r.snippet.substring(0, 100)}_\n`;
    msg += `${r.url}\n\n`;
  });
  return msg.trim();
}

module.exports = { webSearch, extractSearchIntent, wantsVoiceReply, formatSearchResults };
