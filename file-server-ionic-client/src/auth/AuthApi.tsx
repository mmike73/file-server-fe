import { fileServerAxios } from "../api/FileServerAxios";

export type UserDto = {
    username: string;
    password: string;
}

export const getAccessToken = async () => {
    try {
        return await fileServerAxios.post('/refresh-token', { refreshToken: localStorage.getItem('refreshToken') } );
    } catch {
        return undefined;
    }
}

export const loginUser = async (request: UserDto) => {
    try {
        return await fileServerAxios.post('/login', request);
    } catch {
        return undefined;
    }
};
