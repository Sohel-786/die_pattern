import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl: string | undefined = error.config?.url;

      const isLoginRequest =
        requestUrl?.includes("/auth/login") ||
        requestUrl?.endsWith("/auth/login");

      if (
        !isLoginRequest &&
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
