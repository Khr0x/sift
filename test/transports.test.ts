import { describe, expect, it, vi } from 'vitest';
import { WebhookTransport, type LogEntry } from '../src/transports';

describe('WebhookTransport', () => {
  const entry: LogEntry = {
    timestamp: new Date(0).toISOString(),
    severity_text: 'INFO',
    message: 'hello',
  };

  it('Should send serialized logs with configured headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    const transport = new WebhookTransport('https://logs.example.com', {
      headers: { Authorization: 'Bearer token' },
      fetch: fetchMock as any,
    });

    await transport.write(entry, JSON.stringify(entry), 'production');

    expect(fetchMock).toHaveBeenCalledWith('https://logs.example.com', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify(entry),
    }));
  });

  it('Should reject when the webhook returns an error status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const transport = new WebhookTransport('https://logs.example.com', {
      fetch: fetchMock as any,
    });

    await expect(transport.write(entry, JSON.stringify(entry), 'production'))
      .rejects
      .toThrow('Webhook transport failed with status 500');
  });
});
