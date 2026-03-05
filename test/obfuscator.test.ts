import { describe, it, expect } from 'vitest';
import { createRedacter } from '../src/obfuscator';

describe('SIFT Logger - Obfuscator', () => {
  it('Should hide default keys (password, token)', () => {
    const redacter = createRedacter({
        redactedText: '[HIDDEN]'
    });
    const data = {
      username: 'admin',
      password: 'super-secret-password',
      token: 'jwt-token-123'
    };

    const serialized = JSON.stringify(data, redacter);
    const result = JSON.parse(serialized);

    expect(result.username).toBe('admin');
    expect(result.password).toBe('[HIDDEN]');
    expect(result.token).toBe('[HIDDEN]');
  });

  it('Should obfuscate data regardless of case sensitivity', () => {
    const redacter = createRedacter();
    const data = {
      PASSWORD: '123',
      PassWord: '456'
    };

    const result = JSON.parse(JSON.stringify(data, redacter));

    expect(result.PASSWORD).toBe('[REDACTED]');
    expect(result.PassWord).toBe('[REDACTED]');
  });

  it('Should hide custom keys provided by the user', () => {
    const redacter = createRedacter(['api_key', 'phone_number']);
    const data = {
      user: 'john',
      api_key: 'sk_live_123',
      phone_number: '555-1234'
    };

    const result = JSON.parse(JSON.stringify(data, redacter));

    expect(result.api_key).toBe('[REDACTED]');
    expect(result.phone_number).toBe('[REDACTED]');
    expect(result.user).toBe('john');
  });

  it('Should work on deeply nested objects and arrays', () => {
    const redacter = createRedacter();
    const data = {
      company: 'Hemia',
      employees: [
        {
          name: 'Alice',
          credentials: { password: 'alice-pass', cvv: '123' }
        },
        {
          name: 'Bob',
          credentials: { password: 'bob-pass', cvv: '456' }
        }
      ]
    };

    const result = JSON.parse(JSON.stringify(data, redacter));

    expect(result.employees[0].credentials.password).toBe('[REDACTED]');
    expect(result.employees[1].credentials.cvv).toBe('[REDACTED]');
    expect(result.employees[0].name).toBe('Alice');
  });
});