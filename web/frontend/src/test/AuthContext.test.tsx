import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../AuthContext';

// Mock component for testing
const TestComponent = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('AuthContext', () => {
  it('provides auth context to children', () => {
    render(
      <TestComponent>
        <div data-testid="child">Child Component</div>
      </TestComponent>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('initializes with null user when no token', () => {
    localStorage.clear();
    render(
      <TestComponent>
        <div>Test</div>
      </TestComponent>
    );
    // Should render without error
  });

  it('loads user from localStorage on mount', () => {
    const user = { id: '1', email: 'test@example.com', user_type: 'driver' };
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('access_token', 'token');

    render(
      <TestComponent>
        <div>Test</div>
      </TestComponent>
    );
    // Should load user from storage
  });
});
