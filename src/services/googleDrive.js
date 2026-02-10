/**
 * Google Drive Storage Adapter (Server Proxy)
 * Uses backend endpoints that handle OAuth + refresh tokens.
 */

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = rawApiBase.replace(/\/+$/, '');
const AUTH_REQUIRED_EVENT = 'focusnook-drive-auth-required';

const isAuthStatus = (status) => status === 401 || status === 403;

const createAuthError = async (response) => {
    const text = await response.text().catch(() => '');
    const error = new Error(`Drive auth required: ${response.status} ${text}`);
    error.code = 'AUTH_REQUIRED';
    return error;
};

class GoogleDriveAdapter {
    constructor() {
        this.cache = {};
        this.saveTimeout = null;
        this.isLoaded = false;
        this.user = null;
        this.hasAuthFailure = false;
    }

    async initialize() {
        return true;
    }

    async connect() {
        this.hasAuthFailure = false;
        window.location.assign(`${API_BASE}/auth/google/start`);
        return true;
    }

    async restoreSession() {
        try {
            const res = await fetch(`${API_BASE}/auth/session`, {
                credentials: 'include',
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data?.authenticated) {
                this.user = data.user || null;
                this.hasAuthFailure = false;
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to restore Drive session:', err);
            return false;
        }
    }

    async disconnect() {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (err) {
            console.error('Failed to logout from Drive session:', err);
        } finally {
            this.cache = {};
            this.isLoaded = false;
            this.user = null;
            this.hasAuthFailure = false;
        }
    }

    emitAuthRequired() {
        if (this.hasAuthFailure) return;
        this.hasAuthFailure = true;
        this.cache = {};
        this.isLoaded = false;
        this.user = null;
        window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
    }

    async request(path, options = {}) {
        const requestInit = {
            ...options,
            credentials: 'include',
        };

        const run = () => fetch(`${API_BASE}${path}`, requestInit);

        let res = await run();
        if (isAuthStatus(res.status)) {
            // Retry once to handle freshly expired sessions/tokens.
            res = await run();
            if (isAuthStatus(res.status)) {
                this.emitAuthRequired();
                throw await createAuthError(res);
            }
        }

        return res;
    }

    async loadAllData() {
        const res = await this.request('/drive/data');

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Drive load failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        this.cache = data || {};
        this.isLoaded = true;
    }

    async saveAllData() {
        const res = await this.request('/drive/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(this.cache),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Drive save failed: ${res.status} ${text}`);
        }
    }

    async getItem(key) {
        if (!this.isLoaded) {
            await this.loadAllData();
        }
        return this.cache[key] || null;
    }

    async setItem(key, value) {
        this.cache[key] = value;
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            try {
                await this.saveAllData();
            } catch (error) {
                console.error('Drive save failed:', error);
            }
        }, 2000);
    }

    async removeItem(key) {
        delete this.cache[key];
        await this.saveAllData();
    }
}

export const googleDriveAdapter = new GoogleDriveAdapter();
export const DRIVE_AUTH_REQUIRED_EVENT = AUTH_REQUIRED_EVENT;

// Backwards-compatible stub for old usage in App
export const loadGoogleScripts = () => Promise.resolve();
