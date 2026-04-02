import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const PrivateRoute = ({ children, adminRequired = false }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);

    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    const isAuthenticated = !!token && token.trim() !== '';
    const role = (user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';

    useEffect(() => {
        const verifyToken = async () => {
            try {
                if (!isAuthenticated) {
                    setIsValid(false);
                    setLoading(false);
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/auth/verify-token', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const verified = response.data?.valid && response.data?.user;
                setIsValid(verified);

                if (!verified) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userEmail');
                }
            } catch (error) {
                console.error('Token verify error:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('userEmail');
                setIsValid(false);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [isAuthenticated, token]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
    }

    if (!isValid) {
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
