import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('mackllc_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mackllc_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: newToken, username: uname, role } = response.data;
    localStorage.setItem('mackllc_token', newToken);
    localStorage.setItem('mackllc_user', JSON.stringify({ username: uname, role }));
    setToken(newToken);
    setUser({ username: uname, role });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mackllc_token');
    localStorage.removeItem('mackllc_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
