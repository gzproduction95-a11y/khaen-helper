import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from './App';

describe('Khaen app', () => {
  test('renders the existing controls', () => {
    render(<App />);
    expect(screen.getByText('1. Key / 调式设定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RESET GRAPH' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OCTAVE' })).toBeInTheDocument();
  });
});
