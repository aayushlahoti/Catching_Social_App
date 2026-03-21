import api from "./axiosSetup.js";

export const getUser = async(data) => {
    return api.get('/auth/profile', data);
}

export const updateDetails = async(data) => {
    return api.put('/auth/updateDetails', data);
}

export const updateStatus = async(data) => {
    return api.patch('auth/updateStatus', data);
}

export const updateAge = async(data) => {
    return api.patch('/auth/updateAge', data);
}

export const updateGender = async(data) => {
    return api.patch('/auth/updateGender', data);
}

export const uploadProfilePic = async(data) => {
    return api.post('/auth/upload-profile-picture', data);
}

export const removePic = async(data) => {
    return api.delete('/auth/delete-profile-picture', data);
}

export const deleteProfile = async(data) => {
    return api.delete('/users/delete-profile', data);
}