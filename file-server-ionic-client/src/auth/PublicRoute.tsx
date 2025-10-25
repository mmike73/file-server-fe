import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Redirect, Route } from 'react-router-dom';
import { AuthContext, AuthState, useAuth } from './AuthProvider';


export interface PublicRouteProps {
  component: any;
  path: string;
  exact?: boolean;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuth();
  return (
    <Route {...rest} render={props => {
      if (!isAuthenticated) {
        return <Component {...props} />;
      }
      return <Redirect to={{ pathname: '/' }}/>
    }}/>
  );
}
