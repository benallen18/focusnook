/**
 * Local File Storage Adapter
 * Uses the File System Access API and persists a file handle in IndexedDB.
 */

const DB_NAME = 'focusnook-local-file-db';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'focusnook-data-file-handle';
const DEFAULT_FILE_NAME = 'focusnook-data.json';
const cloneJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

const canUseBrowserStorage = () => typeof window !== 'undefined';

const openHandleDb = () => new Promise((resolve, reject) => {
    if (!canUseBrowserStorage() || !window.indexedDB) {
        resolve(null);
        return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
});

const readStoredHandle = async () => {
    const db = await openHandleDb();
    if (!db) return null;

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(HANDLE_KEY);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('Failed to read stored file handle'));

        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
    });
};

const writeStoredHandle = async (handle) => {
    const db = await openHandleDb();
    if (!db) return;

    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(handle, HANDLE_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Failed to persist file handle'));

        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
    });
};

const clearStoredHandle = async () => {
    const db = await openHandleDb();
    if (!db) return;

    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(HANDLE_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('Failed to clear stored file handle'));

        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
    });
};

class LocalFileAdapter {
    constructor() {
        this.cache = {};
        this.saveTimeout = null;
        this.isLoaded = false;
        this.fileHandle = null;
        this.fileName = null;
    }

    isSupported() {
        if (!canUseBrowserStorage()) return false;
        return ('showSaveFilePicker' in window) || ('showOpenFilePicker' in window);
    }

    async initialize() {
        return this.isSupported();
    }

    async getStatus() {
        const supported = this.isSupported();
        const hasStoredHandle = supported ? !!(await readStoredHandle()) : false;

        return {
            supported,
            connected: !!this.fileHandle,
            hasStoredHandle,
            fileName: this.fileName,
        };
    }

    async queryPermission(mode = 'readwrite') {
        if (!this.fileHandle) return 'denied';
        if (typeof this.fileHandle.queryPermission !== 'function') return 'prompt';

        try {
            return await this.fileHandle.queryPermission({ mode });
        } catch {
            return 'prompt';
        }
    }

    async queryWritePermission() {
        const permission = await this.queryPermission('readwrite');
        return permission === 'granted';
    }

    async requestPermission(mode = 'readwrite') {
        if (!this.fileHandle) return 'denied';
        if (typeof this.fileHandle.requestPermission !== 'function') return 'denied';

        try {
            return await this.fileHandle.requestPermission({ mode });
        } catch {
            return 'denied';
        }
    }

    async requestWritePermission() {
        const permission = await this.requestPermission('readwrite');
        return permission === 'granted';
    }

    async loadAllData() {
        if (!this.fileHandle) {
            throw new Error('No local file is linked.');
        }

        const file = await this.fileHandle.getFile();
        const text = await file.text();

        if (!text.trim()) {
            this.cache = {};
            this.isLoaded = true;
            return cloneJson(this.cache);
        }

        try {
            const parsed = JSON.parse(text);
            this.cache = parsed && typeof parsed === 'object' ? parsed : {};
            this.isLoaded = true;
        } catch {
            throw new Error('Selected file is not valid JSON.');
        }

        return cloneJson(this.cache);
    }

    async saveAllData() {
        if (!this.fileHandle) return;

        let permission = await this.queryPermission('readwrite');
        if (permission !== 'granted') {
            permission = await this.requestPermission('readwrite');
        }

        if (permission !== 'granted') {
            throw new Error('Write permission to local file was revoked. Please relink the file.');
        }

        const writable = await this.fileHandle.createWritable();
        await writable.write(JSON.stringify(this.cache, null, 2));
        await writable.close();
    }

    async connect() {
        return this.connectWithMode('create-or-select');
    }

    async relink() {
        return this.connectWithMode('select-existing');
    }

    async connectWithMode(mode = 'create-or-select') {
        if (!this.isSupported()) {
            throw new Error('Local file storage is not supported in this browser.');
        }

        let handle;
        const useOpenPicker = mode === 'select-existing'
            || !('showSaveFilePicker' in window)
            || ('showOpenFilePicker' in window && mode !== 'create-or-select');

        if (!useOpenPicker && 'showSaveFilePicker' in window) {
            handle = await window.showSaveFilePicker({
                suggestedName: DEFAULT_FILE_NAME,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
        } else if ('showOpenFilePicker' in window) {
            const [openedHandle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            handle = openedHandle;
        } else {
            throw new Error('No supported file picker is available in this browser.');
        }

        this.fileHandle = handle;
        this.fileName = handle.name || DEFAULT_FILE_NAME;

        const granted = await this.requestWritePermission();
        if (!granted) {
            this.fileHandle = null;
            this.fileName = null;
            throw new Error('Permission denied for local file access.');
        }

        await writeStoredHandle(handle);
        await this.loadAllData();
        return {
            fileName: this.fileName,
            data: cloneJson(this.cache),
            isEmpty: Object.keys(this.cache).length === 0,
        };
    }

    async verifyPermission() {
        if (!this.fileHandle) return false;
        const permission = await this.requestPermission('readwrite');
        if (permission === 'granted') {
            await this.loadAllData();
            return true;
        }
        return false;
    }

    async restoreSession() {
        if (!this.isSupported()) return { success: false, reason: 'unsupported' };

        const storedHandle = await readStoredHandle();
        if (!storedHandle) {
            this.fileHandle = null;
            this.fileName = null;
            this.isLoaded = false;
            return { success: false, reason: 'no_stored_handle' };
        }

        this.fileHandle = storedHandle;
        this.fileName = storedHandle.name || DEFAULT_FILE_NAME;

        try {
            const readPermission = await this.queryPermission('read');

            if (readPermission === 'granted') {
                await this.loadAllData();
                return {
                    success: true,
                    fileName: this.fileName,
                    data: cloneJson(this.cache),
                    isEmpty: Object.keys(this.cache).length === 0,
                };
            }

            // If we need to prompt, we can't do it automatically on load.
            // Return failure with specific reason so UI can show "Reconnect" button.
            return {
                success: false,
                reason: 'permission_required',
                fileName: this.fileName
            };

        } catch (error) {
            console.error('Failed to load local file session:', error);
            this.cache = {};
            this.isLoaded = false;
            this.fileHandle = null;
            this.fileName = null;
            return { success: false, reason: 'error', error };
        }
    }

    async disconnect() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        this.cache = {};
        this.fileHandle = null;
        this.fileName = null;
        this.isLoaded = false;

        await clearStoredHandle();
    }

    async getItem(key) {
        if (!this.fileHandle) return null;

        if (!this.isLoaded) {
            const restored = await this.restoreSession();
            if (!restored?.success) return null;
        }

        return this.cache[key] ?? null;
    }

    async setItem(key, value) {
        if (!this.fileHandle) return;

        if (!this.isLoaded) {
            try {
                await this.loadAllData();
            } catch (error) {
                console.error('Failed to load local file before setItem:', error);
            }
        }

        this.cache[key] = value;

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            try {
                await this.saveAllData();
            } catch (error) {
                console.error('Failed to save local file data:', error);
            }
        }, 1000);
    }

    async removeItem(key) {
        if (!this.fileHandle) return;

        delete this.cache[key];

        try {
            await this.saveAllData();
        } catch (error) {
            console.error('Failed to remove key from local file data:', error);
        }
    }

    async getAllData() {
        if (!this.fileHandle) return {};
        if (!this.isLoaded) {
            await this.loadAllData();
        }
        return cloneJson(this.cache);
    }

    async replaceAllData(data, options = {}) {
        if (!this.fileHandle) {
            throw new Error('No local file is linked.');
        }

        this.cache = (data && typeof data === 'object') ? cloneJson(data) : {};
        this.isLoaded = true;

        if (options.save !== false) {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            await this.saveAllData();
        }
    }

    async getAll(keys = []) {
        if (!this.fileHandle) return {};
        if (!this.isLoaded) {
            await this.loadAllData();
        }

        const result = {};
        for (const key of keys) {
            result[key] = this.cache[key] ?? null;
        }
        return result;
    }

    async setAll(entries = {}) {
        if (!this.fileHandle) return;
        if (!this.isLoaded) {
            await this.loadAllData();
        }

        this.cache = {
            ...this.cache,
            ...entries,
        };
        await this.saveAllData();
    }
}

export const localFileAdapter = new LocalFileAdapter();
