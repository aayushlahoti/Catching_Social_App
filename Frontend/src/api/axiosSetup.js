import axios from 'axios';
import { getApiBaseUrl } from '../utils/networkHelpers';

//this file is the main character of all the api calls 
//it is used to set up the axios instance and the base url

// Dynamically determine the base URL based on current host
const baseURL = getApiBaseUrl();

const api  = axios.create({
    baseURL: baseURL || import.meta.env.VITE_SERVER_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

//attatching the jwt automatically through interceptors
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if(token){
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

//global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if(error.response?.status === 401){
            console.log("unauthorized access, redirect to the login page");
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default api;