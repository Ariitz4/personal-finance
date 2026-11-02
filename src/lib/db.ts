import { initialData, type AppData } from './finance';

const DB_NAME = 'personal-finance-local';
const DB_VERSION = 1;
const STORE = 'app';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if (!('indexedDB' in window)) { reject(new Error('Este navegador no admite almacenamiento local avanzado.')); return; }
    const request = indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded = () => { const db=request.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el almacenamiento local.'));
  });
}

export async function loadAppData(): Promise<AppData> {
  const db=await openDatabase();
  try {
    const value=await new Promise<AppData|null>((resolve,reject)=>{
      const request=db.transaction(STORE,'readonly').objectStore(STORE).get('root');
      request.onsuccess=()=>resolve(request.result ?? null);
      request.onerror=()=>reject(request.error);
    });
    if (!value) { await saveAppData(initialData); return structuredClone(initialData); }
    return { ...initialData, ...value, funds:value.funds??[], investmentTransactions:value.investmentTransactions??[], fundPrices:value.fundPrices??[], snapshots:value.snapshots??[], wealthSnapshots:value.wealthSnapshots??[] };
  } finally { db.close(); }
}

export async function saveAppData(data: AppData): Promise<void> {
  const db=await openDatabase();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(data,'root');
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error ?? new Error('No se pudieron guardar los datos.'));
      tx.onabort=()=>reject(tx.error ?? new Error('Se canceló el guardado.'));
    });
  } finally { db.close(); }
}

export async function clearLocalData(): Promise<void> {
  const db=await openDatabase();
  try { await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete('root');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);}); }
  finally { db.close(); }
}
