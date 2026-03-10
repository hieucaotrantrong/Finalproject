import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children, adminRequired = false }) => {
    const location = useLocation();

    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    const isAuthenticated = !!token && token.trim() !== '';
    const role = (user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';

    useEffect(() => {
        console.log('PrivateRoute', { token, user });
    }, [token, user]);

    if (!isAuthenticated) {
        return (
            <Navigate
                to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                replace
            />
        );
    }

    if (adminRequired && !isAdmin) {
        return <Navigate to="/home" replace />;
    }

    return children;
};

export default PrivateRoute;
