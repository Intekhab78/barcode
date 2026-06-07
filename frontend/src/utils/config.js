import axios from 'axios';

const LOCAL_BACKEND_URL = 'http://localhost:5011';
const PRODUCTION_BACKEND_URL = import.meta.env.VITE_PRODUCTION_API_URL || 'https://barcodeapi.jtsonline.shop';

// Ek shared axios instance - sab components ye use karein
export const api = axios.create();

// Resolved URL cache
let resolvedUrl = null;

// Local backend check karta hai, agar available hai to localhost, warna production
async function resolveBackendUrl() {
  if (resolvedUrl) return resolvedUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 sec timeout

    const response = await fetch(`${LOCAL_BACKEND_URL}/api/health`, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('✅ Local backend connected:', LOCAL_BACKEND_URL);
      resolvedUrl = LOCAL_BACKEND_URL;
    } else {
      throw new Error('Not healthy');
    }
  } catch {
    console.log('🌐 Local backend unavailable → using production:', PRODUCTION_BACKEND_URL);
    resolvedUrl = PRODUCTION_BACKEND_URL;
  }

  return resolvedUrl;
}

// App start hone par ek baar URL resolve karo aur axios instance set karo
resolveBackendUrl().then((url) => {
  api.defaults.baseURL = url;
});

// Axios interceptor: agar koi request baseURL ke bina aaye to resolve karo
api.interceptors.request.use(async (config) => {
  if (!api.defaults.baseURL) {
    api.defaults.baseURL = await resolveBackendUrl();
  }
  return config;
});

// Purane code ke saath compatibility ke liye (jo API_BASE_URL import karte hain)
export async function getApiBaseUrl() {
  return resolveBackendUrl();
}

// Static export - sirf fallback ke liye, getApiBaseUrl() ya api instance prefer karo
export const API_BASE_URL = LOCAL_BACKEND_URL;

