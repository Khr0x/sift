import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  trace_id: string;
  span_id?: string;
  parent_span_id?: string;
  request_id?: string;
  trace_flags?: string;
  [key: string]: any;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

export function getTraceId(): string | undefined {
  return getTraceContext()?.trace_id;
}
