import { test, expect } from '@playwright/test';
import { cn } from '../src/lib/utils';

test.describe('utils cn function', () => {
  test('merges basic class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  test('handles conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  test('handles arrays of classes', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  test('ignores falsy values', () => {
    expect(cn('class1', null, undefined, false, 0, '')).toBe('class1');
  });

  test('merges tailwind classes correctly (twMerge behavior)', () => {
    // twMerge resolves conflicts
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-red-500/50', 'bg-red-500/20')).toBe('bg-red-500/20');
  });

  test('combines clsx and twMerge behavior', () => {
    expect(cn('p-2', { 'p-4': true, 'text-red-500': false })).toBe('p-4');
  });
});
