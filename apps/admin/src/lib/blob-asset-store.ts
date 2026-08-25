/**
 * IndexedDB-backed binary asset store with an in-memory fallback
 * when IndexedDB is missing (private mode, Node tests).
 */

const DB_NAME = "lumenx-admin-blob-assets";
const STORE_NAME = "assets";
const DB_VERSION = 1;

export type BlobAssetRecord = {
  id: string;
  mimeType: string;
  blob: Blob;
  createdAt: number;
};

const memoryFallback = new Map<string, BlobAssetRecord>();

function indexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    run(store, resolve, reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export function newBlobAssetId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}:${rand}`;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array } | null {
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith("data:")) return null;
  const comma = trimmed.indexOf(",");
  if (comma < 0) return null;
  const meta = trimmed.slice(5, comma);
  const payload = trimmed.slice(comma + 1);
  const isBase64 = /;base64$/i.test(meta) || /;base64;/i.test(meta);
  const mimeType = (meta.split(";")[0] || "").trim() || "application/octet-stream";
  try {
    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return { mimeType, bytes };
    }
    const decoded = decodeURIComponent(payload);
    return { mimeType, bytes: new TextEncoder().encode(decoded) };
  } catch {
    return null;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const copy = new Uint8Array(parsed.bytes.byteLength);
  copy.set(parsed.bytes);
  return new Blob([copy.buffer], { type: parsed.mimeType });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to read blob"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
      reader.readAsDataURL(blob);
    });
  }
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const mime = blob.type || "application/octet-stream";
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function putBlobAsset(id: string, blob: Blob, mimeType: string): Promise<void> {
  const record: BlobAssetRecord = { id, blob, mimeType, createdAt: Date.now() };
  memoryFallback.set(id, record);
  if (!indexedDbAvailable()) return;
  try {
    await withStore<void>("readwrite", (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Memory fallback already holds the record.
  }
}

export async function putDataUrlAsset(id: string, dataUrl: string): Promise<boolean> {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return false;
  await putBlobAsset(id, blob, blob.type || "application/octet-stream");
  return true;
}

export async function getBlobAsset(id: string): Promise<BlobAssetRecord | null> {
  if (indexedDbAvailable()) {
    try {
      const fromDb = await withStore<BlobAssetRecord | null>("readonly", (store, resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve((request.result as BlobAssetRecord | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
      if (fromDb) {
        memoryFallback.set(id, fromDb);
        return fromDb;
      }
    } catch {
      // Fall through to memory.
    }
  }
  return memoryFallback.get(id) ?? null;
}

export async function getBlobAssetAsDataUrl(id: string): Promise<string | undefined> {
  const record = await getBlobAsset(id);
  if (!record) return undefined;
  return blobToDataUrl(record.blob);
}

export async function deleteBlobAsset(id: string): Promise<void> {
  memoryFallback.delete(id);
  if (!indexedDbAvailable()) return;
  try {
    await withStore<void>("readwrite", (store, resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Ignore storage delete failures.
  }
}

/** Test helper — clears the in-memory fallback only. */
export function resetBlobAssetMemory(): void {
  memoryFallback.clear();
}
