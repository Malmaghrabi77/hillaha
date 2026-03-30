// Polyfill WeakRef and FinalizationRegistry for Hermes engines that lack them.
// Must run BEFORE any library (e.g. @supabase/realtime-js) that uses WeakRef.

if (typeof globalThis.WeakRef === "undefined") {
  globalThis.WeakRef = class WeakRef {
    constructor(target) {
      this._target = target;
    }
    deref() {
      return this._target;
    }
  };
}

if (typeof globalThis.FinalizationRegistry === "undefined") {
  globalThis.FinalizationRegistry = class FinalizationRegistry {
    constructor(_callback) {}
    register() {}
    unregister() {}
  };
}
