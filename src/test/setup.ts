import '@testing-library/jest-dom/vitest';

function needsStoragePolyfill(storageKey: 'localStorage' | 'sessionStorage') {
  return (
    typeof window === 'undefined' ||
    !(storageKey in window) ||
    typeof window[storageKey]?.getItem !== 'function' ||
    typeof window[storageKey]?.setItem !== 'function' ||
    typeof window[storageKey]?.removeItem !== 'function' ||
    typeof window[storageKey]?.clear !== 'function'
  );
}

function createMemoryStorage(): Storage {
  let data = new Map<string, string>();

  return {
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
}

function defineStorage(storageKey: 'localStorage' | 'sessionStorage', storage: Storage) {
  Object.defineProperty(window, storageKey, { value: storage, configurable: true });
  Object.defineProperty(globalThis, storageKey, { value: storage, configurable: true });
}

if (typeof window !== 'undefined') {
  if (needsStoragePolyfill('localStorage')) defineStorage('localStorage', createMemoryStorage());
  if (needsStoragePolyfill('sessionStorage')) defineStorage('sessionStorage', createMemoryStorage());
}
