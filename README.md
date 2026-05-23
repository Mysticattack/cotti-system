# 🤖 Cotti System

Automatisches KI-Antwortsystem für **WhatsApp** und **Discord** – betrieben durch **Ollama (llama3)** lokal auf deinem Server.

---

## Features

| Feature | Status |
|---|---|
| WhatsApp Textnachrichten beantworten | ✅ |
| WhatsApp Sprachnachrichten transkribieren + beantworten | ✅ |
| Discord DMs beantworten | ✅ |
| Discord Mentions beantworten | ✅ |
| Chatverlauf / Kontext pro Gespräch | ✅ |
| Nummern/User-IDs blockieren | ✅ |
| Footer „— Cotti System" | ✅ |
| Lokale KI (kein Cloud-Abo nötig) | ✅ |

---

## Voraussetzungen

- Ubuntu/Debian Server (oder PC)
- Node.js 18+
- Ollama
- Python 3 + Whisper (für Sprachnachrichten)
- Discord Bot Token

---

## Installation

```bash
# Projekt klonen / entpacken
cd cotti-system

# Alles automatisch installieren
chmod +x setup.sh
./setup.sh
```

---

## Konfiguration

### Discord Bot erstellen
1. Gehe zu https://discord.com/developers/applications
2. „New Application" → Namen vergeben
3. Linkes Menü: **Bot** → **Add Bot**
4. **Token** kopieren
5. Wichtig: Folgende **Privileged Gateway Intents** aktivieren:
   - ✅ `MESSAGE CONTENT INTENT`
   - ✅ `SERVER MEMBERS INTENT`
6. Bot auf deinen Server einladen (OAuth2 → Bot → `bot` + `Send Messages` + `Read Message History`)

### .env befüllen
```bash
nano .env
```
```
DISCORD_TOKEN=dein_token_hier
```

### Nummern/User blockieren

In `config.js`:

```js
whatsapp: {
  blocklist: [
    '4915123456789',   // Diese Nummer wird ignoriert
    '4916100000000',
  ],
},

discord: {
  blocklist: [
    '123456789012345678',  // Diese Discord User-ID wird ignoriert
  ],
},
```

> Discord User-ID herausfinden: Discord → Einstellungen → Erweitert → Entwicklermodus an → Rechtsklick auf User → „ID kopieren"

---

## Starten

```bash
npm start
```

Beim **ersten Start** erscheint ein QR Code im Terminal → mit WhatsApp scannen (Verknüpfte Geräte).

Die Session wird gespeichert, danach kein Scan mehr nötig.

---

## Als Systemdienst einrichten (Autostart)

```bash
# Dateien in System-Ordner kopieren
sudo cp -r . /opt/cotti-system
sudo cp cotti-system.service /etc/systemd/system/

# Dienst aktivieren
sudo systemctl daemon-reload
sudo systemctl enable cotti-system
sudo systemctl start cotti-system

# Status prüfen
sudo systemctl status cotti-system

# Logs anschauen
sudo journalctl -u cotti-system -f
```

---

## Wie es funktioniert

```
Eingehende Nachricht
       │
       ▼
Blockliste prüfen ──► blockiert? → ignorieren
       │
       ▼
Sprachnachricht? ──► Whisper transkribiert Audio zu Text
       │
       ▼
Chatverlauf laden (letzte 10 Nachrichten)
       │
       ▼
Ollama (llama3) antwortet
       │
       ▼
Antwort + „— Cotti System" Footer zurücksenden
```

---

## Konfigurationsreferenz

| Option | Standard | Beschreibung |
|---|---|---|
| `ollama.model` | `llama3` | Ollama Modell |
| `ollama.contextMessages` | `10` | Anzahl Nachrichten im Kontext |
| `ollama.host` | `http://localhost:11434` | Ollama URL |
| `footer` | `— Cotti System` | Footer-Text |
| `whatsapp.voiceMessages` | `true` | Sprachnachrichten verarbeiten |
| `whatsapp.whisperModel` | `base` | Whisper Modell (tiny/base/small/medium) |
| `whatsapp.blocklist` | `[]` | Blockierte WA-Nummern |
| `discord.respondToDMs` | `true` | Auf DMs antworten |
| `discord.respondToMentions` | `true` | Auf Mentions antworten |
| `discord.blocklist` | `[]` | Blockierte Discord User-IDs |
