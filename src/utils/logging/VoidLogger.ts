import type { Logger, LoggerFactory } from './types';

class VoidLogger implements Logger {
  debug(): void {}
  info(): void {}
  log(): void {}
  warn(): void {}
  error(): void {}
  group(): void {}
  groupEnd(): void {}
}

export class VoidLoggerFactory implements LoggerFactory {
  private static instance: Logger = new VoidLogger();

  loggerFor(): Logger {
    return VoidLoggerFactory.instance;
  }
}

