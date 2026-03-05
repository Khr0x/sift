import { randomUUID } from 'crypto';
import { traceStorage } from './context';

/**
 * Middleware para extraer o generar un trace ID y almacenarlo en el contexto de ejecución.
 * Esto permite que el trace ID esté disponible en cualquier parte del código que ejecute
 * dentro de la misma solicitud, facilitando la correlación de logs y trazas.
 */
export interface SiftTraceMiddlewareOptions {
  /** Nombre del header para extraer/inyectar el trace ID. Default: 'x-trace-id' */
  headerName?: string;
  /** Función opcional para generar IDs personalizados si no viene en el header */
  getId?: () => string;
}

export function siftTraceMiddleware(options: SiftTraceMiddlewareOptions = {}) {
  const headerName = (options.headerName || 'x-trace-id').toLowerCase();
  const getId = options.getId || (() => randomUUID());

  return (req: any, res: any, next: any) => {
    let traceId = req.headers[headerName];

    if (!traceId) {
      traceId = getId();
    } else if (Array.isArray(traceId)) {
      traceId = traceId[0];
    }

    traceStorage.run({ trace_id: traceId }, () => {
      res.setHeader(headerName, traceId);
      next();
    });
  };
}