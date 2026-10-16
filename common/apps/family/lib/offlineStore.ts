// The Nila pages' copy on the device: one IndexedDB database with a single key-value store. Keys are per user
// (`parenting:nila:<uid>`, `claims:<uid>`, `member:<uid>`); signing out empties the whole database.
const DB_NAME = "nila-offline";
const STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** The value stored under `key`, or null. Rejects when IndexedDB is unavailable (private browsing). */
export async function readKey<T>(key: string): Promise<T | null> {
  return ((await run("readonly", (s) => s.get(key))) as T | undefined) ?? null;
}

export async function writeKey(key: string, value: unknown): Promise<void> {
  await run("readwrite", (s) => s.put(value, key));
}

/** Forgets everything saved for every user on this device. */
export async function clearOffline(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}
