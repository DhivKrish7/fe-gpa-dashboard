import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the dashboard header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /BSc Financial Engineering/i })).toBeInTheDocument();
  });
});
