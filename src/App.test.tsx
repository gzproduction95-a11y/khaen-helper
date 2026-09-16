import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from './App';

describe('Khaen app', () => {
  test('renders the existing controls', () => {
    render(<App />);
    expect(screen.getByText('1. Key / 调式设定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RESET GRAPH' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OCTAVE' })).toBeInTheDocument();
  });

  test('selects A minor on the primary pipes', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Am' })[0]);
    for (const id of ['L4', 'R2', 'R1']) {
      expect(screen.getByTestId(`pipe-${id}`)).toHaveAttribute('data-active', 'true');
    }
  });

  test('reset clears manually selected pipes', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('pipe-R1'));
    fireEvent.click(screen.getByRole('button', { name: 'RESET GRAPH' }));
    expect(screen.getByTestId('pipe-R1')).toHaveAttribute('data-active', 'false');
  });

  test('octave reveals matching alternate and tonic pipes', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('pipe-R1'));
    fireEvent.click(screen.getByRole('button', { name: 'OCTAVE' }));
    expect(screen.getByTestId('pipe-R4')).toHaveAttribute('data-octave-active', 'true');
    expect(screen.getByTestId('pipe-R8')).toHaveAttribute('data-octave-active', 'true');
  });

  test('changing scale clears the current graph', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('pipe-R1'));
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'major' } });
    expect(screen.getByTestId('pipe-R1')).toHaveAttribute('data-active', 'false');
  });

  test('sidebar can be hidden and restored', () => {
    render(<App />);
    fireEvent.click(screen.getByTitle('Hide Sidebar'));
    fireEvent.click(screen.getByTitle('Show Sidebar'));
    expect(screen.getByText('1. Key / 调式设定')).toBeInTheDocument();
  });
});
