/**
 * API service stub.
 * 
 * This file is intentionally minimal — the landing page does not make
 * any backend API calls. The login/signup API integration is reserved
 * for future implementation.
 *
 * When ready, replace this with an axios instance:
 *   import axios from 'axios';
 *   const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
 *   export default api;
 */

const api = {
    get: async (url) => {
        console.warn(`[api stub] GET ${url} — backend not yet connected`);
        throw new Error('Backend not connected yet');
    },
    post: async (url, data) => {
        console.warn(`[api stub] POST ${url} — backend not yet connected`, data);
        throw new Error('Backend not connected yet');
    },
    put: async (url, data) => {
        console.warn(`[api stub] PUT ${url} — backend not yet connected`, data);
        throw new Error('Backend not connected yet');
    },
    delete: async (url) => {
        console.warn(`[api stub] DELETE ${url} — backend not yet connected`);
        throw new Error('Backend not connected yet');
    },
};

export default api;
