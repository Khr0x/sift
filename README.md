<div align="center">

# SIFT

### Secure Information Filtering Tool

![npm](https://img.shields.io/npm/v/@khr0x/sift)
![license](https://img.shields.io/npm/l/@khr0x/sift)
![build](https://img.shields.io/github/actions/workflow/status/khr0x/sift/ci.yml)
![coverage](https://img.shields.io/codecov/c/github/khr0x/sift)
![typescript](https://img.shields.io/badge/stack-TypeScript-blue)

> **"Precision-engineered data sanitization for modern logging infrastructures."**

SIFT is an advanced log filtering and processing tool designed to act as a **security sieve** between your application and your data transports. Its purpose is to intercept, analyze, and sanitize any information flow, ensuring that sensitive data (PII) never leaves the secure execution environment.

</div>

---



## 🚀 Why SIFT?

In modern architectures powered by microservices, distributed observability, and real-time tracing, logs can easily become a data exposure vector. SIFT enforces a **Zero-Trust Logging** strategy, where every log entry is treated as potentially unsafe until it has been validated and sanitized.

---

## 🛠 Key Features

### 🔍 Intelligent Pattern Detection

Advanced regex-based detection system that automatically identifies sensitive data in string values:

* **Credit cards** with Luhn algorithm validation
* **Email addresses** 
* **US Social Security Numbers (SSN)**
* **JWT tokens** (eyJ... signature pattern)
* **API keys** (32+ alphanumeric strings with validation)
* Custom patterns with optional validation functions

### 🛡️ Dual-Layer Protection

Two complementary redaction strategies working in tandem:

1. **Key-based redaction**: Masks values of known sensitive field names (password, token, cvv, etc.)
2. **Pattern-based redaction**: Scans string values for sensitive patterns like credit cards, emails, SSNs

### ⚙️ Flexible Configuration

Highly customizable redaction behavior:

* Custom sensitive keys beyond defaults
* Custom regex patterns with validation
* Masking styles: `full` (complete replacement) or `partial` (show last 4 chars)
* Configurable redaction text (`[REDACTED]`, `***`, or any custom string)
* Key exclusion list for technical identifiers

### 🔗 Distributed Tracing Support

Built-in middleware for request tracing:

* Automatic trace ID generation or extraction from headers
* AsyncLocalStorage-based context propagation
* Compatible with Express and NestJS
* OpenTelemetry-ready structure

### ⚡ Stream Processing

Optimized to process high log throughput in real-time with negligible CPU overhead.

* Sync and async processing modes
* High-performance pipeline compatibility
* Designed for containers and serverless environments

### 🔌 Multiple Transports

Extensible transport system for flexible log delivery:

* **ConsoleTransport**: Formatted console output with colors (dev) or JSON (prod)
* Easy to extend with custom transports (file, HTTP, APM integrations)

---

## 📦 Installation

```bash
npm install @khr0x/sift
```

---

## 🧩 Usage Examples

### Basic Logger Usage

```ts
import { SiftLogger } from 'sift';

const logger = new SiftLogger({
  env: 'production',
  redactKeys: ['credit_card', 'phone']
});

logger.info('User payment processed', {
  user_id: '12345',
  credit_card: '4532-1234-5678-9012',  // Will be [REDACTED]
  amount: 150.00,
  email: 'user@example.com'             // Auto-detected and [REDACTED]
});
```

### Advanced Redactor Configuration

```ts
import { SiftLogger } from 'sift';

const logger = new SiftLogger({
  env: 'production',
  redactKeys: ['internal_id'],
  maskStyle: 'partial',                 // Show last 4 characters
  redactedText: '***HIDDEN***',         // Custom redaction text
  customPatterns: [{
    name: 'ip_address',
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
  }]
});

logger.info('Request received', {
  card: '4532-1234-5678-9012',          // Output: ************9012
  ip: '192.168.1.1'                     // Output: ***HIDDEN***
});
```

### Distributed Tracing with Express

```ts
import express from 'express';
import { siftTraceMiddleware, SiftLogger } from 'sift';

const app = express();
const logger = new SiftLogger({ env: 'production' });

// Add tracing middleware
app.use(siftTraceMiddleware({
  headerName: 'x-trace-id',
  getId: () => `trace-${Date.now()}`
}));

app.get('/api/users', (req, res) => {
  logger.info('Fetching users', { count: 100 });
  // trace_id automatically included in logs
  res.json({ users: [] });
});

app.listen(3000);
```

### NestJS Integration

```ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestSiftTraceMiddleware, SiftNestLogger, WebhookTransport } from 'sift';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NestSiftTraceMiddleware)
      .forRoutes('*');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new SiftNestLogger({
      env: 'production',
      transports: [
        new WebhookTransport('https://logs.example.com/ingest', {
          headers: { Authorization: `Bearer ${process.env.LOG_TOKEN}` },
          timeoutMs: 3000
        })
      ]
    })
  });

  await app.listen(3000);
}
```

### NestJS Database Transport

```ts
import { Injectable, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  LogEntry,
  NestSiftTraceMiddleware,
  SiftNestLogger,
  Transport
} from 'sift';

@Injectable()
class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  create(entry: LogEntry, raw: Record<string, any>) {
    return this.prisma.log.create({
      data: {
        timestamp: new Date(entry.timestamp),
        level: entry.severity_text,
        message: entry.message,
        traceId: entry.trace_id,
        spanId: entry.span_id,
        parentSpanId: entry.parent_span_id,
        requestId: entry.request_id,
        attributes: entry.attributes ?? {},
        raw
      }
    });
  }
}

class DatabaseLogTransport implements Transport {
  constructor(private readonly logsService: LogsService) {}

  async write(entry: LogEntry, serialized: string) {
    await this.logsService.create(entry, JSON.parse(serialized));
  }
}

@Module({
  providers: [LogsService]
})
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NestSiftTraceMiddleware)
      .forRoutes('*');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const logsService = app.get(LogsService);

  app.useLogger(new SiftNestLogger({
    env: 'production',
    transports: [
      new DatabaseLogTransport(logsService)
    ]
  }));

  await app.listen(3000);
}
```

When `NestSiftTraceMiddleware` is active, database log rows receive `trace_id`,
`span_id`, `parent_span_id`, and `request_id` automatically.

### Standalone Redacter

```ts
import { createRedacter } from 'sift';

const redacter = createRedacter({
  customKeys: ['secret_key'],
  maskStyle: 'partial',
  excludeKeys: ['trace_id', 'request_id']  // Never redact these
});

const data = {
  trace_id: 'abc-123',                    // Not redacted (excluded)
  secret_key: 'sk_live_1234567890',       // Output: ***************7890
  email: 'user@example.com'               // Output: [REDACTED]
};

const sanitized = JSON.parse(JSON.stringify(data, redacter));
console.log(sanitized);
```

### Custom Transport

```ts
import { SiftLogger, type LogEntry, type Transport } from 'sift';

class HttpTransport implements Transport {
  async write(entry: LogEntry, serialized: string) {
    const response = await fetch('https://logs.example.com/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized
    });

    if (!response.ok) {
      throw new Error(`Log ingest failed with status ${response.status}`);
    }
  }
}

const logger = new SiftLogger({
  env: 'production',
  transports: [new HttpTransport()]
});

logger.info('Log sent to remote server');
```

---

## 📚 API Reference

### SiftLogger Options

```ts
interface SiftOptions {
  env?: 'development' | 'production';   // Default: process.env.NODE_ENV
  redactKeys?: string[];                // Additional keys to redact
  excludeKeys?: string[];               // Keys that should never be redacted
  maskStyle?: 'full' | 'partial';       // Default: 'full'
  redactedText?: string;                // Default: '[REDACTED]'
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    validate?: (match: string) => boolean;
  }>;
  transports?: Transport[];             // Default: [ConsoleTransport]
}
```

### Default Sensitive Keys

The following keys are redacted by default (case-insensitive):

`password`, `token`, `secret`, `cvv`, `card_number`, `authorization`, `api_key`, `apikey`, `access_token`, `refresh_token`, `private_key`, `ssn`, `social_security`, `tax_id`, `credit_card`

### Default Pattern Detection

- **Credit Cards**: 13-19 digits with optional spaces/dashes, validated with Luhn algorithm
- **Emails**: Standard email format validation
- **SSN**: Format `XXX-XX-XXXX`
- **JWT**: Tokens starting with `eyJ...`
- **API Keys**: 32+ alphanumeric characters (validated for letter+number mix)

---

## 🧠 Conceptual Architecture

```
Application Layer
        ↓
    Middleware (Tracing)
        ↓
   SIFT Logger (Redaction)
        ↓
 Transports (Console / File / HTTP / APM)
```

SIFT acts as a **mandatory intermediate layer** between your application and any logging transport.

---

## 🔐 Security Philosophy

SIFT follows these principles:

1. **Fail-Safe Default** – If a key is not explicitly allowed, it can be considered for inspection.
2. **Least Exposure** – Minimize the surface area of exposed data in logs.
3. **Observability Without Liability** – Maximum traceability without compromising compliance.

---

## 🏗 Use Cases

* Multi-tenant SaaS platforms
* GDPR / HIPAA compliant systems
* FinTech infrastructures
* Public APIs using JWT authentication
* Internal auditing systems

---

## 🛣 Roadmap

* [x] Distributed tracing support with AsyncLocalStorage
* [x] Pattern-based detection with Luhn validation
* [x] NestJS middleware support
* [x] Express middleware support
* [x] Configurable masking styles (full/partial)
* [x] Custom patterns with validation
* [ ] Official Winston plugin
* [ ] Official Pino plugin
* [ ] File transport
* [ ] HTTP transport
* [ ] OpenTelemetry exporter
* [ ] WASM mode for edge runtimes
* [ ] Offline inspection CLI

---

## 🤝 Contributing

Contributions are welcome. Open an issue or submit a Pull Request following the repository guidelines.

---

## 📄 License

ISC License

---

**SIFT** — Data security without sacrificing observability.
