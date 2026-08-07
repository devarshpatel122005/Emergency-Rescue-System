import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Frontend Smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders victim home page by default', () => {
    render(<App />);

    expect(screen.getByText('Emergency Response System')).toBeInTheDocument();
    expect(screen.getAllByText('Login').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Register').length).toBeGreaterThan(0);
    expect(screen.getByText('Fire')).toBeInTheDocument();
    expect(screen.getByText('Assault')).toBeInTheDocument();
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
