import { test, expect } from '@playwright/test';
import { extractStoreName, parseVideoProduct } from '../src/utils/videoUtils';

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

test.describe('parseVideoProduct', () => {
  test('should fallback to treating as standard text when parsing invalid JSON', () => {
    const invalidJson = "{ invalid json }";
    const result = parseVideoProduct(invalidJson);

    expect(result.captionText).toBe(invalidJson);
    expect(result.productName).toBe(invalidJson);
  });
});
