import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string, role?: 'STUDENT' | 'FACULTY' | 'ADMIN') => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('campusflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('campusflow_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('campusflow_token');
      if (storedToken) {
        try {
          const profile = await authApi.getCurrentUser();
          const currentUser: User = {
            user_id: profile.user_id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            faculty_id: profile.faculty_id,
            student_id: profile.student_id,
            full_name: profile.faculty_details?.name || profile.student_details?.name || profile.username,
          };
          setUser(currentUser);
          localStorage.setItem('campusflow_user', JSON.stringify(currentUser));
        } catch (error) {
          console.error("Token verification failed:", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string, role?: 'STUDENT' | 'FACULTY' | 'ADMIN'): Promise<User> => {
    const res = await authApi.login({ username, password, role });
    const userObj: User = {
      user_id: res.user_id,
      username: res.username,
      email: res.email,
      role: res.role,
      faculty_id: res.faculty_id,
      student_id: res.student_id,
      full_name: res.full_name || res.username,
    };
    setToken(res.access_token);
    setUser(userObj);
    localStorage.setItem('campusflow_token', res.access_token);
    localStorage.setItem('campusflow_user', JSON.stringify(userObj));
    return userObj;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campusflow_token');
    localStorage.removeItem('campusflow_user');
  };

  const refreshUser = async () => {
    try {
      const profile = await authApi.getCurrentUser();
      const currentUser: User = {
        user_id: profile.user_id,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        faculty_id: profile.faculty_id,
        student_id: profile.student_id,
        full_name: profile.faculty_details?.name || profile.student_details?.name || profile.username,
      };
      setUser(currentUser);
      localStorage.setItem('campusflow_user', JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
