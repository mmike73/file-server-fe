import axios from "axios";

export const fileServerAxios = axios.create({
        baseURL: import.meta.env.VITE_BASE_URL,
});