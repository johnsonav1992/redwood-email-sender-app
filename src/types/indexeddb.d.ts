export interface IDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  createObjectStore(
    name: string,
    options?: IDBObjectStoreParameters
  ): IDBObjectStore;
  deleteObjectStore(name: string): void;
  transaction(
    storeNames: string | string[],
    mode?: IDBTransactionMode
  ): IDBTransaction;
  close(): void;
}

export interface IDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  indexNames: DOMStringList;
  autoIncrement: boolean;
  add(value: unknown, key?: IDBValidKey): IDBRequest;
  clear(): IDBRequest;
  delete(key: IDBValidKey | IDBKeyRange): IDBRequest;
  get(key: IDBValidKey | IDBKeyRange): IDBRequest;
  put(value: unknown, key?: IDBValidKey): IDBRequest;
  createIndex(
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
  ): IDBIndex;
}

export interface IDBTransaction {
  db: IDBDatabase;
  mode: IDBTransactionMode;
  objectStoreNames: DOMStringList;
  oncomplete: ((this: IDBTransaction, ev: Event) => void) | null;
  onerror: ((this: IDBTransaction, ev: Event) => void) | null;
  onabort: ((this: IDBTransaction, ev: Event) => void) | null;
  objectStore(name: string): IDBObjectStore;
  abort(): void;
}

export interface IDBRequest {
  result: unknown;
  error: DOMException | null;
  source: IDBObjectStore | IDBIndex | IDBCursor | null;
  transaction: IDBTransaction | null;
  readyState: IDBRequestReadyState;
  onsuccess: ((this: IDBRequest, ev: Event) => void) | null;
  onerror: ((this: IDBRequest, ev: Event) => void) | null;
}

export interface IDBOpenDBRequest extends IDBRequest {
  onupgradeneeded:
    | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => void)
    | null;
  onblocked: ((this: IDBOpenDBRequest, ev: Event) => void) | null;
}

export interface IDBVersionChangeEvent extends Event {
  oldVersion: number;
  newVersion: number | null;
  target: IDBOpenDBRequest;
}

export interface DOMStringList {
  length: number;
  item(index: number): string | null;
  contains(string: string): boolean;
}

export type IDBTransactionMode = 'readonly' | 'readwrite' | 'versionchange';
export type IDBRequestReadyState = 'pending' | 'done';
export type IDBValidKey = number | string | Date | ArrayBuffer | IDBValidKey[];

export interface IDBObjectStoreParameters {
  keyPath?: string | string[] | null;
  autoIncrement?: boolean;
}

export interface IDBIndexParameters {
  unique?: boolean;
  multiEntry?: boolean;
}

export interface IDBIndex {
  name: string;
  objectStore: IDBObjectStore;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface IDBCursor {
  source: IDBObjectStore | IDBIndex;
  direction: IDBCursorDirection;
  key: IDBValidKey;
  primaryKey: IDBValidKey;
}

export type IDBCursorDirection = 'next' | 'nextunique' | 'prev' | 'prevunique';

declare global {
  interface Window {
    indexedDB: IDBFactory;
  }

  const indexedDB: IDBFactory;

  interface IDBFactory {
    open(name: string, version?: number): IDBOpenDBRequest;
    deleteDatabase(name: string): IDBOpenDBRequest;
    cmp(first: IDBValidKey, second: IDBValidKey): number;
  }
}
