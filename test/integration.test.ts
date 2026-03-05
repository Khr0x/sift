import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SiftLogger } from '../src/logger';
import { siftTraceMiddleware } from '../src/middleware';
import { ConsoleTransport } from '../src/transports';

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
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', logResult.trace_id);

    expect(logResult.severity_text).toBe('INFO');
    expect(logResult.message).toBe('Processing user payment');
    expect(logResult.attributes.usuario).toBe('Jhon Doe');

    expect(logResult.attributes.numero_tarjeta).toBe('[REDACTED]');
    expect(logResult.attributes.cvv).toBe('[REDACTED]');
    expect(logResult.attributes.monto).toBe(1500);
  });
});