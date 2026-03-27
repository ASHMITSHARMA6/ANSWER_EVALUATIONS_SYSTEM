import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MaterialLibrary from './MaterialLibrary';
import axiosInstance from '../api/axiosInstance';

jest.mock('../api/axiosInstance');

const mockGet = (url) => {
  if (url.startsWith('/material-library/references')) {
    return Promise.resolve({ data: { references: [] } });
  }
  if (url === '/material-library') {
    return Promise.resolve({ data: { materials: [] } });
  }
  if (url === '/tests') {
    return Promise.resolve({ data: { tests: [] } });
  }
  return Promise.resolve({ data: {} });
};

describe('MaterialLibrary', () => {
  beforeEach(() => {
    axiosInstance.get.mockImplementation(mockGet);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no materials exist', async () => {
    render(<MaterialLibrary />);

    expect(screen.getByText(/Material Library/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith('/material-library');
    });

    expect(
      screen.getByText(/No canonical materials yet/i)
    ).toBeInTheDocument();
  });
});
