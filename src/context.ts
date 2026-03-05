import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  trace_id: string;
  span_id?: string;
  [key: string]: any;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}