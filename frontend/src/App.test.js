import { render, screen } from '@testing-library/react';
import Login from './components/Login';

jest.mock('./api/axiosInstance');

test('renders login screen', () => {
  render(<Login onLogin={jest.fn()} />);
  const heading = screen.getByText(/Teacher Login/i);
  expect(heading).toBeInTheDocument();
});
