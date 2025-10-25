import React, { useCallback, useContext, useEffect, useLayoutEffect, useReducer, useState } from "react";
import { fileServerAxios } from "../api/FileServerAxios";
import { getAccessToken } from "./AuthApi";
import { jwtDecode } from "jwt-decode";

export type TokenResponseDto = {
    accessToken: string,
    refreshToken: string
};

type LoginFn = (username?: string, password?: string) => void;

export interface AuthState {
    authenticationError: Error | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    pendingAuthentication?: boolean;
    username?: string;
    password?: string;
    accessToken: string | null;
    refreshToken: string | null;
    isInitializing: boolean;
}

const initialAuthState: AuthState = {
    isAuthenticated: false,
    isAuthenticating: false,
    authenticationError: null,
    pendingAuthentication: false,
    accessToken: null,
    refreshToken: null,
    isInitializing: true,
}

export interface AuthContextProps extends AuthState {
    authDispatch: React.Dispatch<Action>;
}

export const AuthContext = React.createContext<AuthContextProps>({
    ...initialAuthState,
    authDispatch: () => undefined,
});

interface AuthProviderProps {
    children: React.ReactNode,
}

export default interface Action {
    type: string;
    payload: any;
}

export const authCotnrolReducer = (state: AuthState, action: Action) => {
    switch (action.type) {
        case 'LOGIN':
            localStorage.setItem("refreshToken", action.payload.refreshToken);
            return {
                ...state, 
                isAuthenticating: false,
                authenticationError: null,
                pendingAuthentication: false,
                isAuthenticated: true,
                isInitializing: false,
                username: action.payload.username,
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken
            };
        case 'LOGOUT':
            localStorage.clear();
            return {
                ...state,
                isAuthenticated: false,
                isAuthenticating: false,
                authenticationError: null,
                pendingAuthentication: false,
                isInitializing: false,
                username: '',
                accessToken: null,
                refreshToken: null
            }
        case 'REFRESH':
            let decoded = jwtDecode(action.payload.accessToken) as any;
            localStorage.setItem("refreshToken", action.payload.refreshToken);
            return {
                ...state,
                isAuthenticating: false,
                authenticationError: null,
                pendingAuthentication: false,
                isAuthenticated: true,
                isInitializing: false,
                username: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken
            }
        case 'AUTHENTICATION_START':
            return {
                ...state,
                isAuthenticating: true,
                pendingAuthentication: true,
                authenticationError: null
            };
        case 'AUTHENTICATION_ERROR':
            return {
                ...state,
                isAuthenticating: false,
                pendingAuthentication: false,
                authenticationError: action.payload.error,
                isAuthenticated: false,
                isInitializing: false
            };
        case 'INIT_COMPLETE':
            return {
                ...state,
                isInitializing: false
            };
        default:
            return state;
    }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [authState, authDispatch] = useReducer(authCotnrolReducer, initialAuthState);
    const [refreshAttempts, setRefreshAttempts] = useState(0);
    const MAX_REFRESH_ATTEMPTS = 3;
    const REFRESH_RETRY_DELAY = 1000; // 1 second

    useEffect(() => {
        const FetchAccessToken = async () => {
            const refreshToken = localStorage.getItem("refreshToken");

            if (!refreshToken) {
                authDispatch({ type: 'INIT_COMPLETE', payload: {} });
                return;
            }

            let attempts = 0;
            
            while (attempts < MAX_REFRESH_ATTEMPTS) {
                try {
                    
                    const response = await getAccessToken();
                    const tokens: TokenResponseDto = response?.data;

                    if (tokens?.accessToken && tokens?.refreshToken) {
                        localStorage.setItem("refreshToken", tokens.refreshToken);
                        authDispatch({
                            type: 'REFRESH',
                            payload: {
                                accessToken: tokens.accessToken,
                                refreshToken: tokens.refreshToken
                            }
                        });
                        setRefreshAttempts(0);
                        return; // Success, exit
                    }
                } catch (err: any) {
                    attempts++;
                    console.error(`Token refresh attempt ${attempts} failed:`, err?.message || err);

                    // If it's a 401/403, the refresh token is invalid - don't retry
                    if (err?.response?.status === 401 || err?.response?.status === 403) {
                        console.error("Refresh token is invalid, logging out");
                        break;
                    }

                    // If we haven't hit max attempts, wait and retry
                    if (attempts < MAX_REFRESH_ATTEMPTS) {
                        await new Promise(resolve => setTimeout(resolve, REFRESH_RETRY_DELAY * attempts));
                    }
                }
            }

            // All attempts failed
            console.error("Failed to refresh access token after all attempts, logging out");
            localStorage.clear();
            authDispatch({ type: "LOGOUT", payload: { username: "", accessToken: null } });
        };

        FetchAccessToken();
    }, []);

    useLayoutEffect(() => {
        const authInterceptor = fileServerAxios.interceptors.request.use((config) => {
            if (
                !config.url?.includes("/login") &&
                !config.url?.includes("/refresh-token")
            ) {
                config.headers.Authorization = 
                    authState.accessToken
                        ? `Bearer ${authState.accessToken}`
                        : config.headers.Authorization;
            }
            return config;
        });

        return () => {
            fileServerAxios.interceptors.request.eject(authInterceptor);
        };
    }, [authState.accessToken]);

    useLayoutEffect(() => {
        let isRefreshing = false;
        let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

        const processQueue = (error: any, token: string | null = null) => {
            failedQueue.forEach(prom => {
                if (error) {
                    prom.reject(error);
                } else {
                    prom.resolve(token);
                }
            });
            failedQueue = [];
        };

        const refreshInterceptor = fileServerAxios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Don't intercept login/refresh requests
                if (
                    originalRequest.url?.includes("/login") ||
                    originalRequest.url?.includes("/refresh-token")
                ) {
                    return Promise.reject(error);
                }

                // Handle 401/403 errors
                if (
                    error.response?.status === 401 ||
                    (error.response?.status === 403 && error.response?.data?.message === 'Unauthorized')
                ) {
                    // Prevent infinite loops
                    if (originalRequest._retry) {
                        console.error("Token refresh failed, logging out");
                        authDispatch({ type: "LOGOUT", payload: { username: "", accessToken: null } });
                        return Promise.reject(error);
                    }

                    // If already refreshing, queue this request
                    if (isRefreshing) {
                        return new Promise((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        })
                            .then(token => {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                                return fileServerAxios(originalRequest);
                            })
                            .catch(err => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const response = await getAccessToken();
                        const tokens: TokenResponseDto = response?.data;

                        if (tokens?.accessToken && tokens?.refreshToken) {
                            authDispatch({
                                type: 'REFRESH',
                                payload: {
                                    accessToken: tokens.accessToken,
                                    refreshToken: tokens.refreshToken
                                }
                            });

                            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
                            processQueue(null, tokens.accessToken);
                            
                            return fileServerAxios(originalRequest);
                        } else {
                            throw new Error("Invalid token response");
                        }
                    } catch (refreshError: any) {
                        console.error("Token refresh failed:", refreshError?.message || refreshError);
                        processQueue(refreshError, null);
                        
                        // Only logout on auth errors, not network errors
                        if (refreshError?.response?.status === 401 || refreshError?.response?.status === 403) {
                            authDispatch({ type: "LOGOUT", payload: { username: "", accessToken: null } });
                        }
                        
                        return Promise.reject(refreshError);
                    } finally {
                        isRefreshing = false;
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            fileServerAxios.interceptors.response.eject(refreshInterceptor);
        };
    }, [authDispatch]);

    // Show loading state while initializing
    if (authState.isInitializing) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div>Initializing...</div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ ...authState, authDispatch }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider!');
    }
    return context;
};