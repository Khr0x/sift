 const defaultSensitiveKeys = new Set([
  'password', 'token', 'secret', 'cvv', 'card_number', 'authorization',
  'api_key', 'apikey', 'access_token', 'refresh_token', 'private_key',
  'ssn', 'social_security', 'tax_id', 'credit_card'
]);

const sensitivePatterns = [
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}(?:\d{0,3})?\b/g,
    validate: (match: string) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;
      
      let sum = 0;
      let isEven = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    }
  },
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g
  },
  {
    name: 'api_key',
    pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
    validate: (match: string) => {
      const hasLetters = /[A-Za-z]/.test(match);
      const hasNumbers = /[0-9]/.test(match);
      return hasLetters && hasNumbers;
    }
  },
  {
    name: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g
  }
];

/**
 * Configuration options for the redacter function.
 */
export interface RedacterOptions {
  /**
   * Additional object keys to redact beyond the default set.
   * Keys are matched case-insensitively.
   * 
   * @example
   * customKeys: ['user_id', 'session_token']
   */
  customKeys?: string[];
  
  /**
   * Custom regex patterns to detect and redact sensitive data in string values.
   * Each pattern can include an optional validation function to reduce false positives.
   * 
   * @example
   * customPatterns: [{
   *   name: 'phone',
   *   pattern: /\d{3}-\d{3}-\d{4}/g,
   *   validate: (match) => match.startsWith('555') // Only redact if starts with 555
   * }]
   */
  customPatterns?: Array<{
    /** Descriptive name for the pattern (used internally) */
    name: string;
    /** Regular expression to match sensitive data. Must use the global flag (g). */
    pattern: RegExp;
    /** Optional validation function. Return true to redact the match, false to keep it. */
    validate?: (match: string) => boolean;
  }>;
  
  /**
   * Masking style for redacted values.
   * - 'full': Replace entire value with redactedText (default)
   * - 'partial': Show last 4 characters, mask the rest with asterisks
   * 
   * @default 'full'
   * @example
   * // 'full': "4532-1234-5678-9010" → "[REDACTED]"
   * // 'partial': "4532-1234-5678-9010" → "****************9010"
   */
  maskStyle?: 'full' | 'partial';
  
  /**
   * Custom text to use when redacting values in 'full' mask style.
   * 
   * @default '[REDACTED]'
   * @example
   * redactedText: '***SENSITIVE***'
   * redactedText: '🔒'
   */
  redactedText?: string;
}

/**
 * Creates a JSON replacer function that automatically redacts sensitive data.
 * 
 * This function returns a replacer that can be used with JSON.stringify() to mask
 * sensitive information in objects. It detects sensitive data in two ways:
 * 
 * 1. **Key-based redaction**: Masks values of object keys that match known sensitive
 *    field names (e.g., 'password', 'token', 'api_key')
 * 
 * 2. **Pattern-based redaction**: Scans string values for sensitive patterns like
 *    credit cards (validated with Luhn algorithm), emails, SSNs, JWT tokens, and API keys
 * 
 * @param options - Configuration options or array of custom keys (for backward compatibility)
 * 
 * @returns A replacer function compatible with JSON.stringify()
 * 
 * @example
 * // Basic usage
 * const redacter = createRedacter();
 * JSON.stringify(data, redacter, 2);
 * 
 * @example
 * // With custom keys
 * const redacter = createRedacter(['user_id', 'session_id']);
 * 
 * @example
 * // With full options
 * const redacter = createRedacter({
 *   customKeys: ['internal_id'],
 *   maskStyle: 'partial',
 *   redactedText: '***HIDDEN***',
 *   customPatterns: [{
 *     name: 'ip_address',
 *     pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
 *   }]
 * });
 * JSON.stringify(data, redacter, 2);
 * 
 * @remarks
 * Default sensitive keys include: password, token, secret, cvv, card_number, 
 * authorization, api_key, apikey, access_token, refresh_token, private_key, 
 * ssn, social_security, tax_id, credit_card
 * 
 * Default patterns detect: credit cards (Luhn validated), emails, SSNs, 
 * JWT tokens, and API keys (32+ alphanumeric characters)
 */
export function createRedacter(options: RedacterOptions | string[] = {}) {
  const opts: RedacterOptions = Array.isArray(options) 
    ? { customKeys: options } 
    : options;
  
  const { 
    customKeys = [], 
    customPatterns = [], 
    maskStyle = 'full',
    redactedText = '[REDACTED]'
  } = opts;
  
  const keysToMask = new Set([
    ...defaultSensitiveKeys,
    ...customKeys.map(k => k.toLowerCase())
  ]);
  
  const allPatterns = [...sensitivePatterns, ...customPatterns];

  function maskValue(value: string, type?: string): string {
    if (maskStyle === 'partial' && value.length > 4) {
      return '*'.repeat(value.length - 4) + value.slice(-4);
    }
    return redactedText;
  }

  function redactString(str: string): string {
    let result = str;
    
    for (const { pattern, validate, name } of allPatterns) {
      result = result.replace(pattern, (match) => {
        if (validate && !validate(match)) {
          return match;
        }
        return maskValue(match, name);
      });
    }
    
    return result;
  }

  return function replacer(key: string, value: any) {
    if (keysToMask.has(key.toLowerCase())) {
      if (typeof value === 'string') {
        return maskValue(value, 'key');
      }
      return redactedText;
    }
    
    if (typeof value === 'string' && value.length > 0) {
      const redacted = redactString(value);
      if (redacted !== value) {
        return redacted;
      }
    }
    
    return value;
  };
}