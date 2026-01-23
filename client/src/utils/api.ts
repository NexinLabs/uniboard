import axios from "axios";
import { appConfig } from "../config";

const api = axios.create({
    baseURL: appConfig.API_URL || "https://uniboard-backend.nexinlabs.tech/",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user?.token) {
                config.headers["Authorization"] = `Bearer ${user.token}`;
                config.headers["token"] = `Bearer ${user.token}`; // For compatibility
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;