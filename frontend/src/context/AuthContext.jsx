import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { endpoints } from '../api/endpoints';
import { setUnauthorizedHandler } from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const saveAuth = (authData) => {
    const authToken = authData.token;
    const authUser = authData.user;
    sessionStorage.setItem('token', authToken);
    sessionStorage.setItem('user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const login = async (email, password) => {
    const data = await endpoints.login(email, password);
    saveAuth(data);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await endpoints.register(name, email, password);
    saveAuth(data);
    return data;
  };

  const refreshUser = async () => {
    if (!sessionStorage.getItem('token')) return;
    try {
      const updatedUser = await endpoints.getMe();
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      if (err.status === 401) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
