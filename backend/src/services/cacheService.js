const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 250;

class CacheService {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    if (!this.store.has(key)) return null;
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt, createdAt: Date.now() });
    this.prune();
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  deleteByPrefix(prefix) {
    if (!prefix) return 0;
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    this.store.clear();
  }

  stats() {
    return {
      size: this.store.size,
      maxEntries: MAX_ENTRIES
    };
  }

  prune() {
    if (this.store.size <= MAX_ENTRIES) return;
    const entries = Array.from(this.store.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    const removeCount = this.store.size - MAX_ENTRIES;
    for (let i = 0; i < removeCount; i += 1) {
      this.store.delete(entries[i][0]);
    }
  }
}

module.exports = new CacheService();
