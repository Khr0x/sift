import { blue, red, yellow, green, dim } from 'colorette';

export interface LogEntry {
  timestamp: string;
  severity_text: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  request_id?: string;
  trace_flags?: string;
  message: string;
  attributes?: Record<string, any>;
}

export interface Transport {
  write(entry: LogEntry, serialized: string, env: string): void | Promise<void>;
}

export interface WebhookTransportOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class ConsoleTransport implements Transport {
  write(entry: LogEntry, serialized: string, env: string): void {
    if (env === 'production') {
      process.stdout.write(serialized + '\n');
      return;
    }

    const time = dim(entry.timestamp);
    let levelStr = entry.severity_text;

    switch (entry.severity_text) {
      case 'INFO': levelStr = blue(levelStr); break;
      case 'WARN': levelStr = yellow(levelStr); break;
      case 'ERROR': levelStr = red(levelStr); break;
      case 'DEBUG': levelStr = green(levelStr); break;
    }

    const trace = entry.trace_id ? dim(` [${entry.trace_id}]`) : '';
    const safeObj = JSON.parse(serialized).attributes; 
    const attrs = safeObj && Object.keys(safeObj).length > 0 ? `\n${JSON.stringify(safeObj, null, 2)}` : '';

    console.log(`${time} ${levelStr}${trace}: ${entry.message}${attrs}`);
  }
}

export class WebhookTransport implements Transport {
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly url: string, options: WebhookTransportOptions = {}) {
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = options.fetch || fetch;
  }

  async write(entry: LogEntry, serialized: string, env: string): Promise<void> {
    const response = await this.fetchFn(this.url, {
      method: 'POST',
      headers: this.headers,
      body: serialized,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Webhook transport failed with status ${response.status}`);
    }
  }
}
