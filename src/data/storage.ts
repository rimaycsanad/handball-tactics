export interface FileStore {
  readonly kind: string;
  read(name: string): Promise<string | null>;
  write(name: string, value: string): Promise<void>;
}
export class OpfsStore implements FileStore {
  readonly kind = "Böngésző fájltára";
  constructor(private root: FileSystemDirectoryHandle) {}
  async read(name: string) {
    try {
      return await (
        await (await this.root.getFileHandle(name)).getFile()
      ).text();
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") return null;
      throw e;
    }
  }
  async write(name: string, value: string) {
    const handle = await this.root.getFileHandle(name, { create: true });
    const stream = await handle.createWritable();
    try {
      await stream.write(value);
      await stream.close();
    } catch (e) {
      await stream.abort().catch(() => {});
      throw e;
    }
  }
}
export class IndexedDbStore implements FileStore {
  readonly kind = "Böngésző adattára";
  private db: Promise<IDBDatabase>;
  constructor() {
    this.db = new Promise((resolve, reject) => {
      const request = indexedDB.open("handball-tactics", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("files");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async read(name: string): Promise<string | null> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const request = db
        .transaction("files", "readonly")
        .objectStore("files")
        .get(name);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }
  async write(name: string, value: string) {
    const db = await this.db;
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(value, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("A mentés megszakadt."));
    });
  }
}
export async function createFileStore(): Promise<FileStore> {
  if (navigator.storage?.getDirectory) {
    try {
      return new OpfsStore(await navigator.storage.getDirectory());
    } catch (e) {
      if (
        !(e instanceof DOMException) ||
        !["SecurityError", "NotSupportedError"].includes(e.name)
      )
        throw e;
    }
  }
  return new IndexedDbStore();
}
