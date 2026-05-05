const DB_NAME = "whisperbox";
const DB_VERSION = 1;
const STORE = "keyMaterial";

interface KeyRecord {
  id: "current";
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  user_id: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveKeyMaterial(
  user_id: string,
  public_key: string,
  wrapped_private_key: string,
  pbkdf2_salt: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const record: KeyRecord = {
      id: "current",
      user_id,
      public_key,
      wrapped_private_key,
      pbkdf2_salt,
    };
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function loadKeyMaterial(): Promise<Omit<KeyRecord, "id"> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get("current");
    req.onsuccess = () => {
      const record = req.result as KeyRecord | undefined;
      if (!record) {
        resolve(null);
        return;
      }
      const { id: _id, ...rest } = record;
      resolve(rest);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearKeyMaterial(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete("current");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
