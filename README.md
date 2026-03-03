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

### 🔍 Deep-Object Sifting

High-performance recursive traversal engine that identifies sensitive keys inside deeply nested and complex JSON structures.

* Optimized DFS traversal
* Supports objects, arrays, and hybrid structures
* Dynamic sensitive key configuration

### 🛡️ Hardened Security

Implements **Zero-Trust Logging** policies, ensuring no data leaves the process unsanitized.

* Automatic redaction of critical fields
* Configurable partial masking
* Environment-based policies (dev, staging, prod)

### ⚡ Stream Processing

Optimized to process high log throughput in real-time with negligible CPU overhead.

* Sync and async processing modes
* High-performance pipeline compatibility
* Designed for containers and serverless environments

### 📋 Advanced Pattern Matching

Supports advanced RegEx and dynamic whitelist/blacklist strategies to detect patterns such as:

* Credit card numbers
* SSNs
* JWT tokens
* API keys
* Email addresses

### 🔌 Agnostic Integration

Works as an independent middleware and integrates seamlessly with:

* Winston
* Pino

Or can be used as a standalone logger in any Node.js application.

---

## 📦 Installation

```bash
npm install @khr0x/sift
```

---

## 🧩 Basic Usage (TypeScript)

```ts

```

---

## 🧠 Conceptual Architecture

```
Application Layer
        ↓
      SIFT
        ↓
 Transport (Console / File / HTTP / APM)
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

* [ ] Official Winston plugin
* [ ] Official Pino plugin
* [ ] WASM mode for edge runtimes
* [ ] Distributed tracing support (OpenTelemetry)
* [ ] Offline inspection CLI

---

## 🤝 Contributing

Contributions are welcome. Open an issue or submit a Pull Request following the repository guidelines.

---

## 📄 License

MIT License

---

**SIFT** — Data security without sacrificing observability.
