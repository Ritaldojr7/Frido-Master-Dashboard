import '@testing-library/jest-dom/vitest'

// jsdom does not include IntersectionObserver
class MockIntersectionObserver {
  observe = () => null
  disconnect = () => null
  unobserve = () => null
  root = null
  rootMargin = ''
  thresholds = []
}
globalThis.IntersectionObserver = MockIntersectionObserver

// crypto.subtle for AuthGate hashing (optional in some Node/jsdom)
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = globalThis.crypto || {};
  globalThis.crypto.subtle = {
    digest: () => Promise.resolve(new ArrayBuffer(32)),
  };
}
