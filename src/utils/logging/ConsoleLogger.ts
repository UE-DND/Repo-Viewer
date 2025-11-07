import { shouldLog } from './filters';
import type { CoreLogLevel, Logger, LoggerFactory } from './types';
import type { Config } from '@/config';

export interface ConsoleLoggerOptions {
  getDeveloperConfig: () => Config['developer'];
  useCollapsedGroup?: boolean;
}

const MAP_TO_CONSOLE_METHOD: Record<CoreLogLevel, keyof Console> = {
  debug: 'debug',
  info: 'info',
  log: 'log',
  warn: 'warn',
  error: 'error'
};

class ConsoleLogger implements Logger {
  constructor(
    private readonly name: string,
    private readonly options: ConsoleLoggerOptions
  ) {}

  debug(...args: unknown[]): void {
    this.logInternal('debug', args);
  }

  info(...args: unknown[]): void {
    this.logInternal('info', args);
  }

  log(...args: unknown[]): void {
    this.logInternal('log', args);
  }

  warn(...args: unknown[]): void {
    this.logInternal('warn', args);
  }

  error(...args: unknown[]): void {
    this.logInternal('error', args);
  }

  group(label: string): void {
    const config = this.options.getDeveloperConfig();
    if (!shouldLog(this.name, 'debug', config)) {
      return;
    }

    const method = this.options.useCollapsedGroup ? 'groupCollapsed' : 'group';
    const groupMethod = console[method] ?? console.group;
    groupMethod.call(console, `[${this.name}] ${label}`);
  }

  groupEnd(): void {
    const config = this.options.getDeveloperConfig();
    if (!shouldLog(this.name, 'debug', config)) {
      return;
    }
    console.groupEnd();
  }

  private logInternal(level: CoreLogLevel, args: unknown[]): void {
    const config = this.options.getDeveloperConfig();
    if (!shouldLog(this.name, level, config)) {
      return;
    }

    const consoleMethod = MAP_TO_CONSOLE_METHOD[level];
    const log = console[consoleMethod];
    const prefix = `[${this.name}]`;

    if (args.length === 0) {
      log.call(console, prefix);
      return;
    }

    const [first, ...rest] = args;
    if (typeof first === 'string') {
      log.call(console, `${prefix} ${first}`, ...rest);
    } else {
      log.call(console, prefix, ...args);
    }
  }
}

export class ConsoleLoggerFactory implements LoggerFactory {
  constructor(private readonly options: ConsoleLoggerOptions) {}

  loggerFor(name: string): Logger {
    return new ConsoleLogger(name, this.options);
  }
}

