import "@testing-library/jest-dom/vitest";

const needsLocalStoragePolyfill =
  typeof window === 'undefined' ||
  !('localStorage' in window) ||
  typeof window.localStorage?.getItem !== 'function' ||
  typeof window.localStorage?.setItem !== 'function' ||
  typeof window.localStorage?.removeItem !== 'function' ||
  typeof window.localStorage?.clear !== 'function';

if (needsLocalStoragePolyfill && typeof window !== 'undefined') {
  let data = new Map<string, string>();

  const localStoragePolyfill: Storage = {
    get length() {
      return data.size;
    },
    clear() {
      data = new Map();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStoragePolyfill,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStoragePolyfill,
    configurable: true,
  });
}
