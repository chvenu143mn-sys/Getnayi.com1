import { test, expect } from '@playwright/test';
import { extractStoreName, formatINR } from '../src/utils/videoUtils';

test.describe('formatINR', () => {
  test('should return empty string for null or undefined', () => {
    expect(formatINR(null)).toBe('');
    expect(formatINR(undefined)).toBe('');
  });

  test('should format valid numbers correctly as INR', () => {
    // Note: Node environment's Intl formatter usually formats zero as "₹0"
    // However, exact currency symbol representation can vary (e.g. ₹ vs Rs.)
    // But since it's hardcoded to 'en-IN' and 'INR', it should generally use '₹'

    // We can test exact output or replace non-breaking spaces
    // The exact string often contains non-breaking spaces or regular spaces: '₹100' or '₹ 100'
    const zeroFormatted = formatINR(0);
    expect(zeroFormatted).toMatch(/₹\s*0/);

    const hundredFormatted = formatINR(100);
    expect(hundredFormatted).toMatch(/₹\s*100/);

    const largeFormatted = formatINR(100000);
    expect(largeFormatted).toMatch(/₹\s*1,00,000/);
  });
});

test.describe('extractStoreName', () => {
  test('should return empty string for null or undefined', () => {
    expect(extractStoreName(null)).toBe('');
    expect(extractStoreName(undefined)).toBe('');
    expect(extractStoreName('')).toBe('');
  });

  test('should extract known store names from URL', () => {
    expect(extractStoreName('https://www.amazon.com/product')).toBe('Amazon');
    expect(extractStoreName('https://myntra.com/dress')).toBe('Myntra');
    expect(extractStoreName('https://www.shopify.com/store')).toBe('Shopify');
    expect(extractStoreName('https://flipkart.com/item')).toBe('Flipkart');
  });

  test('should handle myshopify subdomains', () => {
    expect(extractStoreName('https://mystore.myshopify.com/product')).toBe('Mystore');
  });

  test('should return Store for unknown generic domains', () => {
    // Falls back to capitalization of first part
    expect(extractStoreName('https://unknownstore.com')).toBe('Unknownstore');
  });

  test('should fallback to Store for invalid URLs', () => {
    // This triggers the try-catch block
    expect(extractStoreName('invalid-url-string')).toBe('Store');
    expect(extractStoreName('htp://')).toBe('Store');
  });
});
