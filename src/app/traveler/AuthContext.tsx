// src/app/traveler/AuthContext.tsx
"use client";

import React, { createContext, useContext } from 'react';

interface UserType {
    id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: UserType | null;
    onLoginRequest: () => void;
    onLogoutRequest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Componente que envuelve el layout y provee el valor
export const AuthProvider = ({
    children,
    user,
    onLoginRequest,
    onLogoutRequest
}: {
    children: React.ReactNode;
    user: UserType | null;
    onLoginRequest: () => void;
    onLogoutRequest: () => Promise<void>;
}) => {
    const value = { user, onLoginRequest, onLogoutRequest };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};