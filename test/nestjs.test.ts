import { describe, expect, it } from 'vitest';
import { SiftNestLogger, NestSiftTraceMiddleware } from '../src';
import { type LogEntry, type Transport } from '../src/transports';

describe('NestJS integration', () => {
  it('Should adapt Nest logger calls into Sift structured logs', () => {
    const writes: Array<LogEntry> = [];
    const transport: Transport = {
      write(entry) {
        writes.push(entry);
      }
    };
    const logger = new SiftNestLogger({
      env: 'production',
      context: 'Bootstrap',
      transports: [transport]
    });

    logger.log('Application started');
    logger.error('Database failed', 'stack trace', 'DatabaseService');

    expect(writes[0].severity_text).toBe('INFO');
    expect(writes[0].attributes?.context).toBe('Bootstrap');
    expect(writes[1].severity_text).toBe('ERROR');
    expect(writes[1].attributes?.context).toBe('DatabaseService');
    expect(writes[1].attributes?.stack).toBe('stack trace');
  });

  it('Should keep trace context available inside Nest middleware', () => {
    const writes: Array<LogEntry> = [];
    const transport: Transport = {
      write(entry) {
        writes.push(entry);
      }
    };
    const logger = new SiftNestLogger({
      env: 'production',
      transports: [transport]
    });
    const middleware = new NestSiftTraceMiddleware();
    const req = { headers: { 'x-trace-id': 'trace-123' } };
    const res = { setHeader() {} };

    middleware.use(req, res, () => {
      logger.log('inside request', 'UsersController');
    });

    expect(writes[0].trace_id).toBe('trace-123');
    expect(writes[0].span_id).toBeDefined();
    expect(writes[0].attributes?.context).toBe('UsersController');
  });
});
