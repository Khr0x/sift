import { randomBytes, randomUUID } from 'crypto';
import { TraceContext, traceStorage } from './context';

export interface HttpTraceOptions {
  headerName?: string;
  requestIdHeaderName?: string;
  traceParentHeaderName?: string;
  getId?: () => string;
  getSpanId?: () => string;
}

interface TraceParent {
  trace_id: string;
  span_id: string;
  trace_flags: string;
}

const defaultHeaderName = 'x-trace-id';
const defaultRequestIdHeaderName = 'x-request-id';
const defaultTraceParentHeaderName = 'traceparent';

function getHeader(headers: Record<string, any> = {}, name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function createSpanId(): string {
  return randomBytes(8).toString('hex');
}

function parseTraceParent(value?: string): TraceParent | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
  if (!match) {
    return undefined;
  }

  return {
    trace_id: match[2].toLowerCase(),
    span_id: match[3].toLowerCase(),
    trace_flags: match[4].toLowerCase(),
  };
}

export function createHttpTraceContext(
  headers: Record<string, any> = {},
  options: HttpTraceOptions = {}
): TraceContext {
  const headerName = (options.headerName || defaultHeaderName).toLowerCase();
  const requestIdHeaderName = (options.requestIdHeaderName || defaultRequestIdHeaderName).toLowerCase();
  const traceParentHeaderName = (options.traceParentHeaderName || defaultTraceParentHeaderName).toLowerCase();
  const traceParent = parseTraceParent(getHeader(headers, traceParentHeaderName));
  const traceId = getHeader(headers, headerName) || traceParent?.trace_id || options.getId?.() || randomUUID();
  const spanId = options.getSpanId?.() || createSpanId();
  const requestId = getHeader(headers, requestIdHeaderName) || traceId;

  return {
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: traceParent?.span_id,
    request_id: requestId,
    trace_flags: traceParent?.trace_flags,
  };
}

export function setHttpTraceHeaders(res: any, context: TraceContext, options: HttpTraceOptions = {}) {
  const headerName = options.headerName || defaultHeaderName;
  const requestIdHeaderName = options.requestIdHeaderName || defaultRequestIdHeaderName;

  res.setHeader?.(headerName, context.trace_id);
  if (context.request_id) {
    res.setHeader?.(requestIdHeaderName, context.request_id);
  }
}

export function runWithHttpTraceContext<T>(
  headers: Record<string, any>,
  options: HttpTraceOptions,
  callback: () => T
): T {
  return traceStorage.run(createHttpTraceContext(headers, options), callback);
}
