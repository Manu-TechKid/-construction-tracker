import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  // Add other user properties here
}

interface AuthState {
  token: string | null;
  authenticated: boolean;
  user: User | null;
}

interface AuthContextType {
  authState: AuthState;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({ token: null, authenticated: false, user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const token = await SecureStore.getItemAsync('token');
      const userString = await SecureStore.getItemAsync('user');
      if (token && userString) {
        try {
          const user = JSON.parse(userString);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setAuthState({ token, authenticated: true, user });
        } catch (e) {
          console.error('Failed to parse user from storage', e);
        }
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
