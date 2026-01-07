import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../AuthContext';

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  it('renders logo/brand', () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByText(/truckify/i)).toBeInTheDocument();
  });

  it('shows login link when not authenticated', () => {
    localStorage.clear();
    renderWithProviders(<Navbar />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithProviders(<Navbar />);
    // Should have navigation structure
    expect(document.querySelector('nav')).toBeInTheDocument();
  });
});
