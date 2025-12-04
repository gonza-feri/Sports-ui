import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

export default api;
