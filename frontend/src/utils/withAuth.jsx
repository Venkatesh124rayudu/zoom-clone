import React from "react";
import { Navigate } from "react-router-dom";

// Wraps a page so only logged-in users can open it; others go to /auth.
const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        if (!localStorage.getItem("token")) {
            return <Navigate to="/auth" replace />;
        }
        return <WrappedComponent {...props} />;
    };
    return AuthComponent;
};

export default withAuth;
