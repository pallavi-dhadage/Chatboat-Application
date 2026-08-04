/**
 * Axios HTTP client — connects to local Flask backend on port 5001
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v1";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach access token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let _refreshing = false;
let _queue = [];

const processQueue = (err, token) => {
  _queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  _queue = [];
};

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (_refreshing) {
        return new Promise((res, rej) => _queue.push({ resolve: res, reject: rej }))
          .then((t) => { orig.headers["Authorization"] = `Bearer ${t}`; return client(orig); });
      }
      orig._retry = true;
      _refreshing = true;
      const rt = localStorage.getItem("refresh_token");
      if (!rt) { _refreshing = false; _redirectLogin(); return Promise.reject(error); }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, { headers: { Authorization: `Bearer ${rt}` } });
        localStorage.setItem("access_token", data.access_token);
        orig.headers["Authorization"] = `Bearer ${data.access_token}`;
        processQueue(null, data.access_token);
        return client(orig);
      } catch (e) {
        processQueue(e, null);
        _redirectLogin();
        return Promise.reject(e);
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

function _redirectLogin() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export default client;
