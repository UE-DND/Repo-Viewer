import { CompositeLoggerFactory } from './CompositeLogger';
import { ConsoleLoggerFactory } from './ConsoleLogger';
import { ErrorReporterLoggerFactory, type ErrorReporter } from './ErrorReporterLogger';
import { InMemoryLogRecorder, RecorderLoggerFactory } from './RecorderLogger';
import { VoidLoggerFactory } from './VoidLogger';
import type { Logger, LoggerFactory } from './types';
import { configManager, getDeveloperConfig, type Config } from '@/config';

const APP_LOGGER_NAME = 'App';

type DeveloperConfig = Config['developer'];

const recorder = new InMemoryLogRecorder(300);

let developerConfigSnapshot: DeveloperConfig = getDeveloperConfig();
let customReporter: ErrorReporter | undefined;
let currentFactory: LoggerFactory = buildFactory(developerConfigSnapshot);
const scopedLoggers = new Map<string, Logger>();

function buildFactory(config: DeveloperConfig): LoggerFactory {
  const logging = config.logging ?? {};
  const factories: LoggerFactory[] = [];

  const shouldEnableConsole = logging.enableConsole ?? config.mode ?? config.consoleLogging;
  if (shouldEnableConsole) {
    factories.push(new ConsoleLoggerFactory({
      getDeveloperConfig: () => developerConfigSnapshot
    }));
  }

  if (logging.enableRecorder) {
    factories.push(new RecorderLoggerFactory(recorder));
  }

  const reporter = resolveErrorReporter(logging);
  if (reporter !== undefined && logging.enableErrorReporting) {
    factories.push(new ErrorReporterLoggerFactory({
      reporter,
      includeWarn: logging.includeWarnInReporting ?? false
    }));
  }

  if (factories.length === 0) {
    return new VoidLoggerFactory();
  }

  if (factories.length === 1) {
    return factories[0]!;
  }

  return new CompositeLoggerFactory(factories);
}

function resolveErrorReporter(logging: DeveloperConfig['logging'] | undefined): ErrorReporter | undefined {
  if (customReporter !== undefined) {
    return customReporter;
  }

  const reportUrl = logging?.reportUrl;
  if (!reportUrl) {
    return undefined;
  }

  return new BeaconErrorReporter(reportUrl);
}

class BeaconErrorReporter implements ErrorReporter {
  constructor(private readonly endpoint: string) {}

  captureException(error: Error, context: { logger: string; args: unknown[] }): void {
    this.send({
      level: 'error',
      logger: context.logger,
      message: error.message,
      stack: error.stack,
      args: context.args
    });
  }

  captureMessage(message: string, context: { logger: string; level: 'warn' | 'error'; args: unknown[] }): void {
    this.send({
      level: context.level,
      logger: context.logger,
      message,
      args: context.args
    });
  }

  private send(payload: Record<string, unknown>): void {
    const body = JSON.stringify({ ...payload, timestamp: Date.now() });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        navigator.sendBeacon(this.endpoint, body);
        return;
      } catch (error) {
        // sendBeacon 失败时回退到 fetch
      }
    }

    if (typeof fetch === 'function') {
      void fetch(this.endpoint, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json'
        },
        keepalive: true,
        mode: 'cors'
      }).catch(() => undefined);
    }
  }
}

function getLoggerInstance(name: string): Logger {
  let logger = scopedLoggers.get(name);
  if (!logger) {
    logger = currentFactory.loggerFor(name);
    scopedLoggers.set(name, logger);
  }
  return logger;
}

function rebuildFactory(config: DeveloperConfig): void {
  developerConfigSnapshot = config;
  currentFactory = buildFactory(config);
  scopedLoggers.clear();
}

configManager.onConfigChange((nextConfig) => {
  rebuildFactory(nextConfig.developer);
});

const createFacade = (name: string) => ({
  debug: (...args: unknown[]) => getLoggerInstance(name).debug(...args),
  info: (...args: unknown[]) => getLoggerInstance(name).info(...args),
  warn: (...args: unknown[]) => getLoggerInstance(name).warn(...args),
  error: (...args: unknown[]) => getLoggerInstance(name).error(...args),
  log: (...args: unknown[]) => {
    const instance = getLoggerInstance(name);
    if (typeof instance.log === 'function') {
      instance.log(...args);
    } else {
      instance.info(...args);
    }
  },
  group: (label: string) => {
    const instance = getLoggerInstance(name);
    if (typeof instance.group === 'function') {
      instance.group(label);
    }
  },
  groupEnd: () => {
    const instance = getLoggerInstance(name);
    if (typeof instance.groupEnd === 'function') {
      instance.groupEnd();
    }
  }
});

export const logger = createFacade(APP_LOGGER_NAME);

export const createScopedLogger = (name: string): ReturnType<typeof createFacade> => createFacade(name);

export const getLoggerFactory = (): LoggerFactory => currentFactory;

export const getLogRecorder = (): InMemoryLogRecorder => recorder;

export const registerLoggerReporter = (reporter: ErrorReporter | undefined): void => {
  customReporter = reporter;
  rebuildFactory(developerConfigSnapshot);
};
