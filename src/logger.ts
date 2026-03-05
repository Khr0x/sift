import { getTraceContext } from './context';
import { createRedacter } from './obfuscator';
import { Transport, ConsoleTransport } from './transports';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'VERBOSE';

export interface SiftOptions {
  env?: 'development' | 'production';
  redactKeys?: string[];
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
        maskStyle: options.maskStyle || 'full',
        customPatterns: options.customPatterns || [],
        redactedText: options.redactedText
    });
    this.transports = options.transports || [new ConsoleTransport()];
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
      message: typeof message === 'string' ? message : JSON.stringify(message),
      attributes,
    };

    const serialized = JSON.stringify(logEntry, this.redacter);

    const finalEntry = JSON.parse(serialized);
    if (traceCtx?.trace_id) finalEntry.trace_id = traceCtx.trace_id;
    if (traceCtx?.span_id) finalEntry.span_id = traceCtx.span_id;


    for (const transport of this.transports) {
        transport.write(finalEntry, JSON.stringify(finalEntry), this.env);
    }
  }

  info(message: any, attributes?: Record<string, any>) { this.dispatch('INFO', message, attributes); }
  error(message: any, attributes?: Record<string, any>) { this.dispatch('ERROR', message, attributes); }
  warn(message: any, attributes?: Record<string, any>) { this.dispatch('WARN', message, attributes); }
  debug(message: any, attributes?: Record<string, any>) { this.dispatch('DEBUG', message, attributes); }
  
  log(message: any, ...optionalParams: any[]) { this.dispatch('INFO', message, ...optionalParams); }
  verbose(message: any, ...optionalParams: any[]) { this.dispatch('VERBOSE', message, ...optionalParams); }
}