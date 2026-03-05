import { blue, red, yellow, green, dim } from 'colorette';

export interface LogEntry {
  timestamp: string;
  severity_text: string;
  trace_id?: string;
  span_id?: string;
  message: string;
  attributes?: Record<string, any>;
}

export interface Transport {
  write(entry: LogEntry, serialized: string, env: string): void | Promise<void>;
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
  constructor(private url: string) {}

  write(entry: LogEntry, serialized: string, env: string): void {
    fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized
    }).catch(err => {
      console.error('Failed to send log to webhook', err);
    });
  }
}