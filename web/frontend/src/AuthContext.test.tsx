import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import type { User } from './api';

// Mock user data for testing
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  user_type: 'driver',
  status: 'active',
  email_verified: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockAccessToken = 'mock-access-token-123';
const mockRefreshToken = 'mock-refresh-token-456';

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('AuthProvider initialization', () => {
    it('should initialize with null user when localStorage is empty', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should initialize with user from localStorage if present', () => {
      // Set up localStorage with user data
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);
      localStorage.setItem('user_id', mockUser.id);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for the effect to run
      waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should throw error when localStorage contains corrupted user data', () => {
      localStorage.setItem('user', 'invalid-json-data');

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should throw an error due to invalid JSON
      expect(() => {
        renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });
      }).toThrow();

      consoleSpy.mockRestore();
    });

    it('should throw error when localStorage has invalid JSON', () => {
      localStorage.setItem('user', '{invalid json}');

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should throw an error due to invalid JSON
      expect(() => {
        renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('login functionality', () => {
    it('should set user and tokens in state and localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      // Check state
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      // Check localStorage
      expect(localStorage.getItem('access_token')).toBe(mockAccessToken);
      expect(localStorage.getItem('refresh_token')).toBe(mockRefreshToken);
      expect(localStorage.getItem('user_id')).toBe(mockUser.id);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should update user when logging in with different user', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Login with first user
      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user).toEqual(mockUser);

      // Login with different user
      const newUser: User = {
        ...mockUser,
        id: 'user-456',
        email: 'newuser@example.com',
        user_type: 'shipper',
      };
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      act(() => {
        result.current.login(newUser, newAccessToken, newRefreshToken);
      });

      // Check state updated
      expect(result.current.user).toEqual(newUser);
      expect(result.current.user?.id).toBe('user-456');
      expect(result.current.user?.email).toBe('newuser@example.com');

      // Check localStorage updated
      expect(localStorage.getItem('access_token')).toBe(newAccessToken);
      expect(localStorage.getItem('refresh_token')).toBe(newRefreshToken);
      expect(localStorage.getItem('user_id')).toBe('user-456');
    });

    it('should handle login with all user types', () => {
      const userTypes: Array<User['user_type']> = [
        'shipper',
        'driver',
        'fleet_operator',
        'dispatcher',
        'admin',
      ];

      userTypes.forEach((userType) => {
        localStorage.clear();
        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        const testUser: User = {
          ...mockUser,
          user_type: userType,
        };

        act(() => {
          result.current.login(testUser, mockAccessToken, mockRefreshToken);
        });

        expect(result.current.user?.user_type).toBe(userType);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle login with user who has unverified email', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const unverifiedUser: User = {
        ...mockUser,
        email_verified: false,
      };

      act(() => {
        result.current.login(unverifiedUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user?.email_verified).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('logout functionality', () => {
    it('should clear user and tokens from state and localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // First login
      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      // Check state cleared
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      // Check localStorage cleared
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user_id')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should handle logout when not logged in', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();

      // Should not throw error
      expect(() => {
        act(() => {
          result.current.logout();
        });
      }).not.toThrow();

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle multiple consecutive logouts', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      // Multiple logouts
      act(() => {
        result.current.logout();
        result.current.logout();
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('isAuthenticated property', () => {
    it('should return false when user is null', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return true when user is present', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should update when user state changes', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(false);

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('useAuth hook error handling', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('AuthProvider component rendering', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div data-testid="test-child">Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <AuthProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should provide context to nested children', () => {
      const NestedComponent = () => {
        const { isAuthenticated } = useAuth();
        return <div data-testid="nested">{isAuthenticated ? 'Logged in' : 'Logged out'}</div>;
      };

      render(
        <AuthProvider>
          <div>
            <div>
              <NestedComponent />
            </div>
          </div>
        </AuthProvider>
      );

      expect(screen.getByTestId('nested')).toHaveTextContent('Logged out');
    });
  });

  describe('localStorage persistence', () => {
    it('should persist user data across component remounts', () => {
      // First render - login
      const { result: result1, unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result1.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result1.current.user).toEqual(mockUser);

      // Unmount
      unmount();

      // Second render - should restore from localStorage
      const { result: result2 } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      waitFor(() => {
        expect(result2.current.user).toEqual(mockUser);
        expect(result2.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle missing localStorage items gracefully', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      // Don't set tokens

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(localStorage.getItem('access_token')).toBeNull();
      });
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle user object with minimal data', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const minimalUser: User = {
        id: '1',
        email: 'min@test.com',
        user_type: 'shipper',
        status: 'pending',
        email_verified: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      act(() => {
        result.current.login(minimalUser, 'token', 'refresh');
      });

      expect(result.current.user).toEqual(minimalUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle empty string tokens', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login(mockUser, '', '');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(localStorage.getItem('access_token')).toBe('');
      expect(localStorage.getItem('refresh_token')).toBe('');
    });

    it('should handle very long token strings', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const longToken = 'a'.repeat(10000);

      act(() => {
        result.current.login(mockUser, longToken, longToken);
      });

      expect(localStorage.getItem('access_token')).toBe(longToken);
      expect(localStorage.getItem('refresh_token')).toBe(longToken);
    });

    it('should handle special characters in user data', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const specialUser: User = {
        ...mockUser,
        email: 'test+special@example.com',
        id: 'user-123-abc-!@#',
      };

      act(() => {
        result.current.login(specialUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user).toEqual(specialUser);
      expect(result.current.user?.email).toBe('test+special@example.com');
    });

    it('should provide working login and logout functions after rerender', () => {
      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();

      rerender();

      // Functions should still work correctly after rerender
      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid login/logout sequences', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
        result.current.logout();
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
        result.current.logout();
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle multiple logins with different users', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const user1: User = { ...mockUser, id: '1', email: 'user1@test.com' };
      const user2: User = { ...mockUser, id: '2', email: 'user2@test.com' };
      const user3: User = { ...mockUser, id: '3', email: 'user3@test.com' };

      act(() => {
        result.current.login(user1, 'token1', 'refresh1');
        result.current.login(user2, 'token2', 'refresh2');
        result.current.login(user3, 'token3', 'refresh3');
      });

      // Should have the last user
      expect(result.current.user).toEqual(user3);
      expect(localStorage.getItem('user_id')).toBe('3');
      expect(localStorage.getItem('access_token')).toBe('token3');
    });
  });

  describe('type safety', () => {
    it('should properly type the user object', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login(mockUser, mockAccessToken, mockRefreshToken);
      });

      // TypeScript should recognize all User properties
      expect(result.current.user?.id).toBeDefined();
      expect(result.current.user?.email).toBeDefined();
      expect(result.current.user?.user_type).toBeDefined();
      expect(result.current.user?.status).toBeDefined();
      expect(result.current.user?.email_verified).toBeDefined();
      expect(result.current.user?.created_at).toBeDefined();
    });

    it('should handle all valid user_type values', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const userTypes: Array<User['user_type']> = [
        'shipper',
        'driver',
        'fleet_operator',
        'dispatcher',
        'admin',
      ];

      userTypes.forEach((type) => {
        const user: User = { ...mockUser, user_type: type };
        act(() => {
          result.current.login(user, mockAccessToken, mockRefreshToken);
        });
        expect(result.current.user?.user_type).toBe(type);
      });
    });
  });
});
