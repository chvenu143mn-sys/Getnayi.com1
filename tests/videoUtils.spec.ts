import { test, expect } from '@playwright/test';
import { extractStoreName, getDesktopFriendlyUrl } from '../src/utils/videoUtils';

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

test.describe('getDesktopFriendlyUrl', () => {
  test('should return empty string for falsy inputs', () => {
    expect(getDesktopFriendlyUrl(null)).toBe('');
    expect(getDesktopFriendlyUrl(undefined)).toBe('');
    expect(getDesktopFriendlyUrl('')).toBe('');
  });

  test('should return standard HTTP/HTTPS URLs as is', () => {
    expect(getDesktopFriendlyUrl('https://www.example.com/path')).toBe('https://www.example.com/path');
    expect(getDesktopFriendlyUrl('http://example.com')).toBe('http://example.com');
  });

  test('should handle Android intent URLs correctly', () => {
    expect(getDesktopFriendlyUrl('intent://www.example.com/path#Intent;scheme=http;package=com.example;end')).toBe('http://www.example.com/path');
    // Fallback to https if no scheme is provided
    expect(getDesktopFriendlyUrl('intent://example.com#Intent;package=com.example;end')).toBe('https://example.com');
  });

  test('should handle known app schemes', () => {
    expect(getDesktopFriendlyUrl('meesho://product/123')).toBe('https://www.meesho.com/product/123');
    expect(getDesktopFriendlyUrl('flipkart://item?id=456')).toBe('https://www.flipkart.com/item?id=456');
    expect(getDesktopFriendlyUrl('amazon://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('amzn://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('myntra://product/789')).toBe('https://www.myntra.com/product/789');
    expect(getDesktopFriendlyUrl('ajio://item/000')).toBe('https://www.ajio.com/item/000');
  });

  test('should return original URL for unknown app schemes', () => {
    expect(getDesktopFriendlyUrl('unknown://app/data')).toBe('unknown://app/data');
    expect(getDesktopFriendlyUrl('somethingelse://path')).toBe('somethingelse://path');
  });

  test('should extract URLs from Play Store redirection URLs', () => {
    // Has both, but url comes first in priority if it starts with http
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&url=https://embedded.url.com')).toBe('https://embedded.url.com');
    // Fallback URL
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&fallback_url=https://fallback.url.com')).toBe('https://fallback.url.com');
    // Doesn't start with http
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&url=custom://scheme')).toBe('https://play.google.com/store/apps/details?id=com.example&url=custom://scheme');
  });

  test('should handle invalid URL inputs triggering the catch block', () => {
    // A string that fails `new URL(urlStr)` inside the Play Store logic
    expect(getDesktopFriendlyUrl('play.google.com/store?url=something_invalid')).toBe('play.google.com/store?url=something_invalid');
  });
});
