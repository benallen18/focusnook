/**
 * Storage Service
 * Provides a unified interface for storage operations (Local vs Cloud)
 */

// Storage Interface (documented for reference)
/*
interface StorageAdapter {
  getItem(key: string): Promise<any>;
  setItem(key: string, value: any): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
*/

class LocalStorageAdapter {
    async getItem(key) {
        return new Promise((resolve) => {
            try {
                const item = localStorage.getItem(key);
                // Attempt to parse JSON, if fails return raw string or null
                try {
                    resolve(item ? JSON.parse(item) : null);
                } catch (e) {
                    resolve(item);
                }
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                resolve(null);
            }
        });
    }

    async setItem(key, value) {
        return new Promise((resolve) => {
            try {
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, stringValue);
                resolve();
            } catch (error) {
                console.error('Error writing to localStorage:', error);
                resolve();
            }
        });
    }

    async removeItem(key) {
        return new Promise((resolve) => {
            localStorage.removeItem(key);
            resolve();
        });
    }
}

// Singleton instance management
let currentAdapter = new LocalStorageAdapter();
let adapterType = 'local'; // 'local' or 'gdrive'

export const storage = {
    get: (key) => currentAdapter.getItem(key),
    set: (key, value) => currentAdapter.setItem(key, value),
    remove: (key) => currentAdapter.removeItem(key),

    // Method to switch adapters (will be used when connecting to Drive)
    setAdapter: (adapter) => {
        currentAdapter = adapter;
        adapterType = adapter.constructor.name === 'GoogleDriveAdapter' ? 'gdrive' : 'local';
        // Persist choice so it survives reloads (simple generic mechanism)
        if (adapterType === 'local') {
            localStorage.removeItem('focusnook-storage-type');
        } else {
            localStorage.setItem('focusnook-storage-type', 'gdrive');
        }
    },

    getType: () => adapterType,
};

export { LocalStorageAdapter };
