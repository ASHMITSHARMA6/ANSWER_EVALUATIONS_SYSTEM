import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import QuestionGenerator from './QuestionGenerator';
import axiosInstance from '../api/axiosInstance';

jest.mock('../api/axiosInstance');
jest.mock('jspdf', () => {
  return function jsPDF() {
    return {
      addImage: jest.fn(),
      addPage: jest.fn(),
      save: jest.fn()
    };
  };
});

jest.mock('html2canvas', () => {
  return jest.fn(() => Promise.resolve({
    width: 100,
    height: 100,
    toDataURL: jest.fn(() => 'data:image/png;base64,')
  }));
});

describe('QuestionGenerator', () => {
  beforeEach(() => {
    axiosInstance.get.mockResolvedValue({ data: { tests: [] } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders question paper upload section', async () => {
    render(<QuestionGenerator />);

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith('/tests');
    });

    expect(
      screen.getByText(/Upload Question Paper/i)
    ).toBeInTheDocument();
  });
});
