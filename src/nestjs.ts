import { createHttpTraceContext, setHttpTraceHeaders, type HttpTraceOptions } from './http-tracing';
import { SiftLogger, type SiftOptions } from './logger';
import { traceStorage } from './context';

export interface SiftTraceMiddlewareOptions extends HttpTraceOptions {}

export interface NestLoggerLike {
  log(message: any, ...optionalParams: any[]): any;
  error(message: any, ...optionalParams: any[]): any;
  warn(message: any, ...optionalParams: any[]): any;
  debug?(message: any, ...optionalParams: any[]): any;
  verbose?(message: any, ...optionalParams: any[]): any;
  fatal?(message: any, ...optionalParams: any[]): any;
  setLogLevels?(levels: string[]): any;
}

export interface SiftNestLoggerOptions extends SiftOptions {
  logger?: SiftLogger;
  context?: string;
}

export class SiftTraceMiddleware {
  constructor(private readonly options: SiftTraceMiddlewareOptions = {}) {}

  use(req: any, res: any, next: (error?: any) => void) {
    const traceContext = createHttpTraceContext(req.headers, this.options);

    req.siftTrace = traceContext;
    setHttpTraceHeaders(res, traceContext, this.options);
    traceStorage.run(traceContext, () => {
      next();
    });
  }
}

export class SiftNestLogger implements NestLoggerLike {
  private readonly logger: SiftLogger;
  private readonly defaultContext?: string;
  private levels?: Set<string>;

  constructor(options: SiftNestLoggerOptions | SiftLogger = {}) {
    if (options instanceof SiftLogger) {
      this.logger = options;
      return;
    }

    this.logger = options.logger || new SiftLogger(options);
    this.defaultContext = options.context;
  }

  log(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('log')) return;
    this.logger.info(message, this.createAttributes(optionalParams));
  }

  error(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('error')) return;
    this.logger.error(message, this.createErrorAttributes(optionalParams));
  }

  warn(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('warn')) return;
    this.logger.warn(message, this.createAttributes(optionalParams));
  }

  debug(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('debug')) return;
    this.logger.debug(message, this.createAttributes(optionalParams));
  }

  verbose(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('verbose')) return;
    this.logger.verbose(message, this.createAttributes(optionalParams));
  }

  fatal(message: any, ...optionalParams: any[]) {
    if (!this.isLevelEnabled('fatal')) return;
    this.logger.error(message, {
      ...this.createErrorAttributes(optionalParams),
      fatal: true,
    });
  }

  setLogLevels(levels: string[]) {
    this.levels = new Set(levels);
  }

  private isLevelEnabled(level: string): boolean {
    return !this.levels || this.levels.has(level);
  }

  private createAttributes(optionalParams: any[]) {
    const context = this.extractContext(optionalParams);
    const extra = optionalParams.filter(value => value !== context);

    return {
      ...(context ? { context } : {}),
      ...(extra.length > 0 ? { extra } : {}),
    };
  }

  private createErrorAttributes(optionalParams: any[]) {
    const context = this.extractContext(optionalParams);
    const [traceOrStack, ...rest] = optionalParams.filter(value => value !== context);

    return {
      ...(context ? { context } : {}),
      ...(typeof traceOrStack === 'string' ? { stack: traceOrStack } : {}),
      ...(traceOrStack && typeof traceOrStack !== 'string' ? { error: traceOrStack } : {}),
      ...(rest.length > 0 ? { extra: rest } : {}),
    };
  }

  private extractContext(optionalParams: any[]): string | undefined {
    const last = optionalParams[optionalParams.length - 1];

    if (typeof last === 'string') {
      return last;
    }

    return this.defaultContext;
  }
}
