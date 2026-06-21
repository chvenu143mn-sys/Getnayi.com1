import { test, expect } from '@playwright/test';
import { getDesktopFriendlyUrl } from '../src/utils/videoUtils';

test.describe('getDesktopFriendlyUrl', () => {
  test('returns empty string for falsy input', () => {
    expect(getDesktopFriendlyUrl('')).toBe('');
    expect(getDesktopFriendlyUrl(null)).toBe('');
    expect(getDesktopFriendlyUrl(undefined)).toBe('');
  });

  test('parses Android Intent URLs correctly', () => {
    expect(getDesktopFriendlyUrl('intent://example.com#Intent;scheme=https;end')).toBe('https://example.com');
    expect(getDesktopFriendlyUrl('intent://example.com/path#Intent;scheme=http;end')).toBe('http://example.com/path');
  });

  test('parses custom App Schemes correctly', () => {
    expect(getDesktopFriendlyUrl('meesho://product/123')).toBe('https://www.meesho.com/product/123');
    expect(getDesktopFriendlyUrl('flipkart://item/abc')).toBe('https://www.flipkart.com/item/abc');
    expect(getDesktopFriendlyUrl('amazon://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('amzn://dp/B08N5WRWNW')).toBe('https://www.amazon.in/dp/B08N5WRWNW');
    expect(getDesktopFriendlyUrl('myntra://shoe/456')).toBe('https://www.myntra.com/shoe/456');
    expect(getDesktopFriendlyUrl('ajio://shirt/789')).toBe('https://www.ajio.com/shirt/789');
  });

  test('handles Play Store redirection URLs correctly', () => {
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&url=https://example.com/product')).toBe('https://example.com/product');
    expect(getDesktopFriendlyUrl('https://play.google.com/store/apps/details?id=com.example&fallback_url=https://fallback.com/product')).toBe('https://fallback.com/product');
  });

  test('returns original string if it is a regular URL', () => {
    expect(getDesktopFriendlyUrl('https://www.example.com/product')).toBe('https://www.example.com/product');
  });

  test('catches error and returns original string', () => {
    // This will trigger an error inside `new URL(urlStr)`
    const invalidUrl = 'play.google.com/store?url=test';
    expect(getDesktopFriendlyUrl(invalidUrl)).toBe(invalidUrl);
  });
});
