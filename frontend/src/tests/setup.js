import '@testing-library/jest-dom';

const store = {};

const localStorageMock = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key, value) {
    store[key] = String(value);
  },
  removeItem(key) {
    delete store[key];
  },
  clear() {
    Object.keys(store).forEach((key) => delete store[key]);
  }
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true
});
