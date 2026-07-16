// Minimal promise wrapper around IndexedDB — one DB, one object store. Kept
// hand-rolled (no dependency): the outbox needs only put/get/getAll/delete.

const DB_NAME = "vajra-offline";
const DB_VERSION = 1;
export const OUTBOX_STORE = "outbox";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(new Error("IndexedDB unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(OUTBOX_STORE))
        req.result.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => {
      // If another tab upgrades the schema later, close so it isn't blocked.
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB open failed"));
    };
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(OUTBOX_STORE, mode);
        const req = run(t.objectStore(OUTBOX_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
      })
  );
}

export const idbPut = <T>(value: T) =>
  tx("readwrite", (s) => s.put(value) as IDBRequest<IDBValidKey>);
export const idbGet = <T>(key: string) =>
  tx<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
export const idbGetAll = <T>() =>
  tx<T[]>("readonly", (s) => s.getAll() as IDBRequest<T[]>);
export const idbDelete = (key: string) =>
  tx("readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
