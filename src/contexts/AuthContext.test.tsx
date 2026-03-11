import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';

// Test component to use the AuthContext
const TestComponent = () => {
  const { isAuthenticated, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <button data-testid="login-btn" onClick={login}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  it('provides initial authentication state as false', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
  });

  it('allows user to login', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });

  it('allows user to logout', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // First login
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    
    // Then logout
    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('maintains authentication state across multiple interactions', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initial state
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    
    // Login -> Logout -> Login cycle
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    
    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    
    fireEvent.click(screen.getByTestId('login-btn'));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });
});