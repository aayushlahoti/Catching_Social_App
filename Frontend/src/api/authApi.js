import api from "./axiosSetup.js";

export const signup = async (data) => {
    return api.post("/api/users/signup", data);
}

export const login = async (data) => {
    return api.post("/api/users/login", data);
}

export const logout = async (data) => {
    return api.post("/api/users/logout", data);
}

export const refreshToken = async (data) => {
    return api.post("/api/users/refresh-token", data);
}

