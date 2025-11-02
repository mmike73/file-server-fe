import { fileServerAxios } from "../api/FileServerAxios";

export type UserDto = {
    username: string;
    password: string;
}

export const getAccessToken = async () => {
    const response = await fileServerAxios.post('/refresh-token', { refreshToken: localStorage.getItem('refreshToken') } );
    console.log(response);
    if (response.status !== 200) {
        console.log("shit");
        throw new Error(`Status code ${response.status}`);
    }   
    return response; 
}

export const loginUser = async (request: UserDto) => {
    try {
        return await fileServerAxios.post('/login', request);
    } catch {
        return undefined;
    }
};
