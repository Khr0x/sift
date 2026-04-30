import { createHttpTraceContext, setHttpTraceHeaders, type HttpTraceOptions } from './http-tracing';
import { traceStorage } from './context';

/**
 * Middleware para extraer o generar un trace ID y almacenarlo en el contexto de ejecución.
 * Esto permite que el trace ID esté disponible en cualquier parte del código que ejecute
 * dentro de la misma solicitud, facilitando la correlación de logs y trazas.
 */
export interface SiftTraceMiddlewareOptions extends HttpTraceOptions {
  /** Nombre del header para extraer/inyectar el trace ID. Default: 'x-trace-id' */
  headerName?: string;
  /** Función opcional para generar IDs personalizados si no viene en el header */
  getId?: () => string;
}

export function siftTraceMiddleware(options: SiftTraceMiddlewareOptions = {}) {
  return (req: any, res: any, next: any) => {
    const traceContext = createHttpTraceContext(req.headers, options);

    req.siftTrace = traceContext;
    setHttpTraceHeaders(res, traceContext, options);
    traceStorage.run(traceContext, () => {
      next();
    });
  };
}
