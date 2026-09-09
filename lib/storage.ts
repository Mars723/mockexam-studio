import { t } from './i18n.ts';
import { validateWorkspace, type Workspace } from './exam.ts';
const DB = 'mockexam-studio-v1';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('workspace');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function loadWorkspace(): Promise<Workspace | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readonly');
    const r = transaction.objectStore('workspace').get('current');
    r.onsuccess = () => {
      try {
        resolve(r.result ? validateWorkspace(r.result) : null);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
    transaction.oncomplete = () => db.close();
  });
}
export async function persistWorkspace(state: Workspace) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readwrite');
    transaction.objectStore('workspace').put(state, 'current');
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error(t('保存被中断')));
    };
  });
}
export function downloadFile(
  name: string,
  content: BlobPart,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
