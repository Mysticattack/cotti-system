require('dotenv').config();
const { startWhatsApp } = require('./src/whatsapp');
const { startDiscord } = require('./src/discord');
const logger = require('./src/logger');

logger.info('🤖 Cotti System startet...');

startWhatsApp();
startDiscord();
