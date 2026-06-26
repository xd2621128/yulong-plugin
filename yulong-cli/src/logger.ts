import type { GlobalOptions } from './types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function configureLogger(options: GlobalOptions, configLevel?: string): void {
  if (options.debug) {
    currentLevel = 'debug';
  }
  else if (options.verbose) {
    currentLevel = 'info';
  }
  else if (configLevel && configLevel in LEVELS) {
    currentLevel = configLevel as LogLevel;
  }
  else {
    currentLevel = 'info';
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export function debug(message: string): void {
  if (shouldLog('debug')) {
    console.error(formatMessage('debug', message));
  }
}

export function info(message: string): void {
  if (shouldLog('info')) {
    console.error(formatMessage('info', message));
  }
}

export function warn(message: string): void {
  if (shouldLog('warn')) {
    console.error(formatMessage('warn', message));
  }
}

export function error(message: string): void {
  if (shouldLog('error')) {
    console.error(formatMessage('error', message));
  }
}
