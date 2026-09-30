import fs from 'fs';
import path from 'path';

const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const formatMessage = (level, message) => {
  const ts = new Date().toISOString();
  return `${ts} [${level.toUpperCase()}] ${message}`;
};

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

const rotateLogs = () => {
  if (fs.existsSync(LOG_FILE)) {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const oldFile = LOG_FILE + '.old';
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      fs.renameSync(LOG_FILE, oldFile);
    }
  }
};

const writeToLog = (msg) => {
  try {
    rotateLogs();
    fs.appendFileSync(LOG_FILE, msg + '\n');
  } catch (e) {
    console.error('Failed to write to log file:', e.message);
  }
};

export const logger = {
  info: (msg) => {
    const formatted = formatMessage('info', msg);
    console.log(formatted);
    writeToLog(formatted);
  },
  warn: (msg) => {
    const formatted = formatMessage('warn', msg);
    console.warn(formatted);
    writeToLog(formatted);
  },
  error: (msg) => {
    const formatted = formatMessage('error', msg);
    console.error(formatted);
    writeToLog(formatted);
  },
  success: (msg) => {
    const formatted = formatMessage('success', msg);
    console.log(formatted);
    writeToLog(formatted);
  }
};
