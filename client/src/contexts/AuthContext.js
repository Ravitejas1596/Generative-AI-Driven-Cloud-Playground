import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: data.user,
                token
              }
            });
          } else {
            localStorage.removeItem('token');
            dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
          }
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Authentication check failed' });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: null });
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: data.user,
            token: data.token
          }
        });
        toast.success('Login successful!');
        return { success: true };
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: data.error || 'Login failed' });
        toast.error(data.error || 'Login failed');
        return { success: false, error: data.error };
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Network error' });
      toast.error('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: data.user,
            token: data.token
          }
        });
        toast.success('Registration successful!');
        return { success: true };
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: data.error || 'Registration failed' });
        toast.error(data.error || 'Registration failed');
        return { success: false, error: data.error };
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Network error' });
      toast.error('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ type: 'UPDATE_USER', payload: data.user });
        toast.success('Profile updated successfully!');
        return { success: true };
      } else {
        toast.error(data.error || 'Failed to update profile');
        return { success: false, error: data.error };
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password changed successfully!');
        return { success: true };
      } else {
        toast.error(data.error || 'Failed to change password');
        return { success: false, error: data.error };
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      return { success: false, error: 'Network error' };
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: state.user,
            token: data.token
          }
        });
        return { success: true };
      } else {
        logout();
        return { success: false };
      }
    } catch (error) {
      logout();
      return { success: false };
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
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

export default AuthContext;
