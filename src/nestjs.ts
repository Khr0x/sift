import { randomUUID } from 'crypto';
import { traceStorage } from './context';

/**
 * NestJS middleware for distributed tracing support.
 * 
 * This middleware extracts or generates a trace ID for each incoming request and stores it
 * in AsyncLocalStorage context, making it available throughout the request lifecycle.
 * The trace ID is also added to the response headers.
 * 
 * @example
 * // Basic usage in NestJS app
 * import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
 * import { SiftTraceMiddleware } from 'sift';
 * 
 * @Module({})
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(SiftTraceMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 * 
 * @example
 * // With custom options
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(new SiftTraceMiddleware({
 *         headerName: 'x-request-id',
 *         getId: () => `trace-${Date.now()}`
 *       }).use.bind(new SiftTraceMiddleware()))
 *       .forRoutes('*');
 *   }
 * }
 */
export class SiftTraceMiddleware {
  /** Name of the HTTP header to read/write the trace ID (normalized to lowercase) */
  private headerName: string;
  
  /** Function to generate a new trace ID when one is not provided */
  private getId: () => string;

  /**
   * Creates a new SiftTraceMiddleware instance.
   * 
   * @param options - Configuration options for the middleware
   * @param options.headerName - HTTP header name for the trace ID (default: 'x-trace-id')
   * @param options.getId - Function to generate new trace IDs (default: randomUUID from crypto)
   * 
   * @example
   * new SiftTraceMiddleware(); // Uses defaults
   * 
   * @example
   * new SiftTraceMiddleware({
   *   headerName: 'x-correlation-id',
   *   getId: () => `${Date.now()}-${Math.random()}`
   * });
   */
  constructor(options: { headerName?: string; getId?: () => string } = {}) {
    this.headerName = (options.headerName || 'x-trace-id').toLowerCase();
    this.getId = options.getId || (() => randomUUID());
  }

  /**
   * Middleware handler function for NestJS/Express.
   * 
   * Extracts the trace ID from request headers or generates a new one if not present.
   * Stores the trace ID in AsyncLocalStorage context and adds it to response headers.
   * 
   * @param req - Express/NestJS request object
   * @param res - Express/NestJS response object
   * @param next - Express next function to continue the middleware chain
   * 
   * @remarks
   * - If the trace ID header contains multiple values (array), only the first one is used
   * - The trace ID is available via `getTraceId()` throughout the request lifecycle
   * - The trace ID is automatically added to the response headers
   */
  use(req: any, res: any, next: (error?: any) => void) {
    let traceId = req.headers[this.headerName];

    if (!traceId) {
      traceId = this.getId();
    } else if (Array.isArray(traceId)) {
      traceId = traceId[0];
    }

    traceStorage.run({ trace_id: traceId }, () => {
      res.setHeader(this.headerName, traceId);
      next();
    });
  }
}