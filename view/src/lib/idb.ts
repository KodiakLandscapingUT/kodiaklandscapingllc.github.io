export function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('kodiak-admin-docs', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface AdminPDF {
  id: string;
  name: string;
  lang: 'en' | 'es';
  active: boolean;
  order: number;
  data: ArrayBuffer;
}

export async function getAdminPDFs(): Promise<AdminPDF[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readonly');
    const store = tx.objectStore('pdfs');
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result as AdminPDF[];
      results.sort((a, b) => a.order - b.order);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveAdminPDF(pdf: AdminPDF): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    const store = tx.objectStore('pdfs');
    const request = store.put(pdf);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAdminPDF(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    const store = tx.objectStore('pdfs');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
