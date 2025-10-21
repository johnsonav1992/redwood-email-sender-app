import { useState, useEffect, useCallback } from 'react';
import type {
  IDBDatabase,
  IDBOpenDBRequest,
  IDBVersionChangeEvent
} from '@/types/indexeddb';

export function useIndexedDB({
  dbName,
  storeName,
  version = 1
}: {
  dbName: string;
  storeName: string;
  version?: number;
}) {
  const [data, setDataState] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(dbName, version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result as IDBDatabase);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
    });
  }, [dbName, storeName, version]);

  const getData = useCallback(async (): Promise<unknown> => {
    try {
      setLoading(true);
      setError(null);

      const db = await openDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get('data');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          setDataState(result || null);
          resolve(result || null);
        };

        request.onerror = () => {
          reject(new Error('Failed to get data'));
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [openDB, storeName]);

  const setData = useCallback(
    async (value: unknown): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const db = await openDB();
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(value, 'data');

        return new Promise((resolve, reject) => {
          transaction.oncomplete = () => {
            setDataState(value);
            db.close();
            resolve();
          };

          transaction.onerror = () => {
            reject(new Error('Failed to save data'));
          };
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [openDB, storeName]
  );

  const deleteData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const db = await openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.delete('data');

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          setDataState(null);
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error('Failed to delete data'));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [openDB, storeName]);

  const clearStore = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const db = await openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          setDataState(null);
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error('Failed to clear store'));
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [openDB, storeName]);

  useEffect(() => {
    getData();
  }, [getData]);

  return {
    data,
    loading,
    error,
    setData,
    getData,
    deleteData,
    clearStore
  };
}
