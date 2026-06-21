import { test, expect } from '@playwright/test';
import { MUTE_STATE_EVENT, getGlobalMuted, setGlobalMuted } from '../src/lib/muteState';

test.describe('muteState', () => {
  test.beforeEach(() => {
    setGlobalMuted(true);
  });

  test('should have initial state as true', () => {
    expect(getGlobalMuted()).toBe(true);
  });

  test('should update global state without window', () => {
    const originalWindow = global.window;

    try {
      // @ts-ignore
      delete global.window;

      setGlobalMuted(false);
      expect(getGlobalMuted()).toBe(false);
    } finally {
      if (originalWindow !== undefined) {
        // @ts-ignore
        global.window = originalWindow;
      }
    }
  });

  test('should update global state and dispatch event when window is defined', () => {
    let eventDispatched = false;
    let eventDetail = null;

    const originalWindow = global.window;
    const originalCustomEvent = global.CustomEvent;

    try {
      // @ts-ignore
      global.window = {
        dispatchEvent: (event: any) => {
          if (event.type === MUTE_STATE_EVENT) {
            eventDispatched = true;
            eventDetail = event.detail;
          }
        }
      };

      // @ts-ignore
      global.CustomEvent = class {
        type: string;
        detail: any;
        constructor(type: string, options: any) {
          this.type = type;
          this.detail = options?.detail;
        }
      } as any;

      setGlobalMuted(true);
      expect(getGlobalMuted()).toBe(true);
      expect(eventDispatched).toBe(true);
      expect(eventDetail).toBe(true);
    } finally {
      if (originalWindow !== undefined) {
        // @ts-ignore
        global.window = originalWindow;
      } else {
        // @ts-ignore
        delete global.window;
      }

      if (originalCustomEvent !== undefined) {
        // @ts-ignore
        global.CustomEvent = originalCustomEvent;
      } else {
        // @ts-ignore
        delete global.CustomEvent;
      }
    }
  });
});
