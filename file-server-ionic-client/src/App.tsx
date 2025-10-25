import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';
import { Login } from './auth/Login';
import { PublicRoute } from './auth/PublicRoute';
import { PrivateRoute } from './auth/PrivateRoute';
import FileExplorer from './file_explorer/FileExplorer';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ItemProvider } from './file_explorer/FileProvider';


setupIonicReact();

const App: React.FC = () => {
  const { isAuthenticated, isAuthenticating, authenticationError, authDispatch } = useAuth();

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          
          <AuthProvider>
            <PublicRoute path="/login" component={Login} exact={true}/>
            <ItemProvider>
              <PrivateRoute path="/" component={FileExplorer} exact={true}/>
            </ItemProvider>
          </AuthProvider>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
