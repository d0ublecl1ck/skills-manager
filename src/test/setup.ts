import "@testing-library/jest-dom/vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    const keys = [...this.store.keys()];
    return keys[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

if (typeof window.localStorage?.setItem !== "function") {
  Object.defineProperty(window, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
}

if (typeof window.sessionStorage?.setItem !== "function") {
  Object.defineProperty(window, "sessionStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
}
