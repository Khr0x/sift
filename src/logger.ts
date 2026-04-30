import { getTraceContext } from './context';
import { createRedacter } from './obfuscator';
import { Transport, ConsoleTransport } from './transports';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'VERBOSE';

export interface SiftOptions {
  env?: 'development' | 'production';
  redactKeys?: string[];
  excludeKeys?: string[];
  maskStyle?: 'full' | 'partial';
  redactedText?: string;
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    validate?: (match: string) => boolean;
  }>;
  transports?: Transport[];
}

export class SiftLogger {
  private env: string;
  private redacter: (key: string, value: any) => any;
  private transports: Transport[];

  constructor(options: SiftOptions = {}) {
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.redacter = createRedacter({
        customKeys: options.redactKeys || [],
        excludeKeys: options.excludeKeys || ['trace_id', 'span_id', 'parent_span_id', 'request_id', 'trace_flags'],
        maskStyle: options.maskStyle || 'full',
        customPatterns: options.customPatterns || [],
        redactedText: options.redactedText
    });
    this.transports = options.transports || [new ConsoleTransport()];
  }

  private safeStringify(value: any): string {
    const seen = new WeakSet<object>();

    try {
      return JSON.stringify(value, (key, currentValue) => {
        const redactedValue = this.redacter(key, currentValue);

        if (typeof redactedValue === 'bigint') {
          return redactedValue.toString();
        }

        if (redactedValue instanceof Error) {
          return {
            name: redactedValue.name,
            message: this.redacter('message', redactedValue.message),
            stack: redactedValue.stack ? this.redacter('stack', redactedValue.stack) : undefined,
          };
        }

        if (typeof redactedValue === 'object' && redactedValue !== null) {
          if (seen.has(redactedValue)) {
            return '[Circular]';
          }
          seen.add(redactedValue);
        }

        return redactedValue;
      }) ?? 'null';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        message: '[Unserializable log entry]',
        serialization_error: message,
      });
    }
  }

  private formatMessage(message: any): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return `${message.name}: ${this.redacter('message', message.message)}`;
    }

    return this.safeStringify(message);
  }

  private dispatch(level: LogLevel, message: any, ...optionalParams: any[]) {
    const traceCtx = getTraceContext();
    let attributes = optionalParams.length > 0 ? optionalParams[0] : undefined;
    
    if (typeof attributes === 'string') {
      attributes = { context: attributes };
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      severity_text: level,
      message: this.formatMessage(message),
      attributes,
    };

    const serialized = this.safeStringify(logEntry);

    const finalEntry = JSON.parse(serialized);
    if (traceCtx?.trace_id) finalEntry.trace_id = traceCtx.trace_id;
    if (traceCtx?.span_id) finalEntry.span_id = traceCtx.span_id;
    if (traceCtx?.parent_span_id) finalEntry.parent_span_id = traceCtx.parent_span_id;
    if (traceCtx?.request_id) finalEntry.request_id = traceCtx.request_id;
    if (traceCtx?.trace_flags) finalEntry.trace_flags = traceCtx.trace_flags;

    const finalSerialized = JSON.stringify(finalEntry);

    for (const transport of this.transports) {
      try {
        const result = transport.write(finalEntry, finalSerialized, this.env);
        if (result && typeof result.catch === 'function') {
          result.catch((error) => {
            console.error('Sift transport failed', error);
          });
        }
      } catch (error) {
        console.error('Sift transport failed', error);
      }
    }
  }

  info(message: any, attributes?: Record<string, any>) { this.dispatch('INFO', message, attributes); }
  error(message: any, attributes?: Record<string, any>) { this.dispatch('ERROR', message, attributes); }
  warn(message: any, attributes?: Record<string, any>) { this.dispatch('WARN', message, attributes); }
  debug(message: any, attributes?: Record<string, any>) { this.dispatch('DEBUG', message, attributes); }
  
  log(message: any, ...optionalParams: any[]) { this.dispatch('INFO', message, ...optionalParams); }
  verbose(message: any, ...optionalParams: any[]) { this.dispatch('VERBOSE', message, ...optionalParams); }
}
