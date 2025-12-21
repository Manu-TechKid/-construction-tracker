import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({ token: null, authenticated: false, user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const token = await SecureStore.getItemAsync('token');
      const userString = await SecureStore.getItemAsync('user');
      if (token && userString) {
        const user = JSON.parse(userString);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setAuthState({ token, authenticated: true, user });
      }
      setLoading(false);
    };
    loadToken();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('https://construction-tracker-webapp.onrender.com/api/v1/auth/login', { email, password });
      const { token, data: { user } } = response.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAuthState({ token, authenticated: true, user });
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to login. Please check your credentials.');
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    delete axios.defaults.headers.common['Authorization'];
    setAuthState({ token: null, authenticated: false, user: null });
  };

  return (
    <AuthContext.Provider value={{ authState, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
