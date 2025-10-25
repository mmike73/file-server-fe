import { useCallback, useContext, useState } from "react";
import { loginUser, UserDto } from "./AuthApi";
import { AuthContext, useAuth } from "./AuthProvider";
import { RouteComponentProps, useHistory } from "react-router";
import { 
    IonButton, 
    IonContent, 
    IonHeader, 
    IonInput, 
    IonLoading, 
    IonPage, 
    IonTitle, 
    IonToolbar, 
    type InputCustomEvent,
    type InputChangeEventDetail, 
} from "@ionic/react";


export const Login: React.FC<RouteComponentProps> = ({ history }) => {
    const [loading, setLoading] = useState(false);
    const navigate = useHistory();

    const { 
        isAuthenticated,
        isAuthenticating,
        authenticationError,
        pendingAuthentication,
        accessToken,
        refreshToken, 
        authDispatch } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleUsernameChange = (e: InputCustomEvent<InputChangeEventDetail>) => {
        setUsername(e.detail.value ?? "");
    };

    const handlePasswwordChange = (e: InputCustomEvent<InputChangeEventDetail>) => {
        setPassword(e.detail.value ?? "");
    };

    const handleLogin = async (e: React.MouseEvent<HTMLIonButtonElement>) => {
        setLoading(true);
        e.preventDefault();
        try {
            const result = await loginUser({username: username, password: password});
            if (result) {
                authDispatch({type: 'LOGIN', payload: 
                    {
                        username: username, 
                        accessToken: result.data.accessToken, 
                        refreshToken: result.data.refreshToken 
                    }});

                
                localStorage.setItem('refreshToken', result.data.refreshToken);

                navigate.push('/');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    

    if (loading) {
        
        return (
            <div>Loading</div>
        );
    }
    
    return (
        <IonPage>
        <IonHeader>
            <IonToolbar>
            <IonTitle>Login</IonTitle>
            </IonToolbar>
        </IonHeader>
        <IonContent>
            <IonInput
                placeholder="Username"
                value={username}
                onIonChange={handleUsernameChange}
            />
            <IonInput
                placeholder="Password"
                value={password}
                onIonChange={handlePasswwordChange}
            />
            <IonLoading isOpen={isAuthenticating}/>
            
            <IonButton onClick={handleLogin}>Login</IonButton>
        </IonContent>
        </IonPage>
    );
};
