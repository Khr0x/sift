import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SiftLogger } from '../src/logger';
import { siftTraceMiddleware } from '../src/middleware';
import { ConsoleTransport, type LogEntry, type Transport } from '../src/transports';

describe('Integration: Middleware + Logger + Obfuscator (ConsoleTransport)', () => {
  let stdoutSpy: any;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('Should generate trace_id, structure the log, and obfuscate while sending directly to process.stdout', () => {
    const logger = new SiftLogger({
      env: 'production',
      redactKeys: ['numero_tarjeta'],
      transports: [new ConsoleTransport()]
    });

    const req = { headers: {} };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();
    const middleware = siftTraceMiddleware();

    middleware(req, res, () => {
      logger.info('Processing user payment', {
        usuario: 'Jhon Doe',
        numero_tarjeta: '4532-1234-5678-9012', 
        cvv: '123',
        monto: 1500
      });

      next();
    });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);

    const outputString = stdoutSpy.mock.calls[0][0];

    const logResult = JSON.parse(outputString);

    expect(logResult.trace_id).toBeDefined();
    expect(typeof logResult.trace_id).toBe('string');
    expect(logResult.span_id).toBeDefined();
    expect(logResult.request_id).toBe(logResult.trace_id);
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', logResult.trace_id);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', logResult.trace_id);

    expect(logResult.severity_text).toBe('INFO');
    expect(logResult.message).toBe('Processing user payment');
    expect(logResult.attributes.usuario).toBe('Jhon Doe');

    expect(logResult.attributes.numero_tarjeta).toBe('[REDACTED]');
    expect(logResult.attributes.cvv).toBe('[REDACTED]');
    expect(logResult.attributes.monto).toBe(1500);
  });

  it('Should extract W3C traceparent context when available', () => {
    const writes: Array<{ serialized: string }> = [];
    const logger = new SiftLogger({
      env: 'production',
      transports: [{
        write(entry, serialized) {
          writes.push({ serialized });
        }
      }]
    });
    const req = {
      headers: {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
      }
    };
    const res = { setHeader: vi.fn() };
    const middleware = siftTraceMiddleware();

    middleware(req, res, () => {
      logger.info('hello');
    });

    const output = JSON.parse(writes[0].serialized);

    expect(output.trace_id).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(output.parent_span_id).toBe('00f067aa0ba902b7');
    expect(output.trace_flags).toBe('01');
  });

  it('Should not crash when logging circular references, bigint values, or Error messages', () => {
    const writes: Array<{ entry: LogEntry; serialized: string }> = [];
    const transport: Transport = {
      write(entry, serialized) {
        writes.push({ entry, serialized });
      }
    };
    const logger = new SiftLogger({
      env: 'production',
      transports: [transport]
    });
    const circular: any = {
      id: 123n,
      password: 'secret'
    };
    circular.self = circular;

    expect(() => logger.error(new Error('Payment failed for user@example.com'), circular)).not.toThrow();

    expect(writes).toHaveLength(1);
    const output = JSON.parse(writes[0].serialized);

    expect(output.message).toBe('Error: Payment failed for [REDACTED]');
    expect(output.attributes.id).toBe('123');
    expect(output.attributes.password).toBe('[REDACTED]');
    expect(output.attributes.self).toBe('[Circular]');
  });

  it('Should not crash when a transport throws synchronously', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new SiftLogger({
      env: 'production',
      transports: [{
        write() {
          throw new Error('transport down');
        }
      }]
    });

    expect(() => logger.info('hello')).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith('Sift transport failed', expect.any(Error));

    errorSpy.mockRestore();
  });

  it('Should handle async transport rejections', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new SiftLogger({
      env: 'production',
      transports: [{
        write() {
          return Promise.reject(new Error('async transport down'));
        }
      }]
    });

    expect(() => logger.info('hello')).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(errorSpy).toHaveBeenCalledWith('Sift transport failed', expect.any(Error));

    errorSpy.mockRestore();
  });
});
