import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import App from './App';

describe('Khaen app', () => {
  test('renders the existing controls', () => {
    render(<App />);
    expect(screen.getByText('1. Key / 调式设定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RESET GRAPH' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OCTAVE' })).toBeInTheDocument();
  });

  test('shows the separated end rows and a text-free inward breath cue', () => {
    render(<App />);
    expect(screen.getAllByTestId('pipe-L8')[0]).toHaveClass('khaen-pipe-row--top');
    expect(screen.getAllByTestId('pipe-R8')[0]).toHaveClass('khaen-pipe-row--top');
    expect(screen.getAllByTestId('pipe-L1')[0]).toHaveClass('khaen-pipe-row--bottom');
    expect(screen.getAllByTestId('pipe-R1')[0]).toHaveClass('khaen-pipe-row--bottom');
    expect(screen.getByTestId('khaen-breath-cue')).toBeInTheDocument();
    expect(screen.getByTestId('khaen-breath-cue')).toHaveTextContent('');
    expect(screen.getByTestId('khaen-left-bottom-label')).toHaveTextContent('L1');
    expect(screen.getByTestId('khaen-right-bottom-label')).toHaveTextContent('R1');
    expect(screen.getByTestId('khaen-left-bottom-label')).toHaveClass('khaen-end-label');
    expect(screen.getByTestId('khaen-right-bottom-label')).toHaveClass('khaen-end-label');
  });

  test('selects A minor on the primary pipes', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Am' })[0]);
    for (const id of ['L4', 'R2', 'R1']) {
      expect(screen.getByTestId(`pipe-${id}`)).toHaveAttribute('data-active', 'true');
    }
  });

  test('shows C-major degrees on the relative A-minor pipe layout', () => {
    render(<App />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'C' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'major' } });

    expect(screen.getByTestId('pipe-R1')).toHaveTextContent('6A');
    expect(screen.getByTestId('pipe-R2')).toHaveTextContent('1C');
    expect(screen.getByTestId('pipe-R3')).toHaveTextContent('5G');
  });

  test('selects a C-major chord on the pipes matching its pitches', () => {
    render(<App />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'C' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'major' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^C$/ })[0]);

    for (const id of ['L6', 'L4', 'R2', 'R3']) {
      expect(screen.getByTestId(`pipe-${id}`)).toHaveAttribute('data-active', 'true');
    }
    expect(screen.getByTestId('pipe-R1')).toHaveAttribute('data-active', 'false');
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

  test('scales the Khaen illustration to fit its available workspace', () => {
    class FixedSizeResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}

      observe(target: Element) {
        const entry = {
          target,
          contentRect: { width: 135, height: 376.5 } as DOMRectReadOnly,
        } as ResizeObserverEntry;
        this.callback([entry], this as unknown as ResizeObserver);
      }

      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', FixedSizeResizeObserver);
    const rendered = render(<App />);
    try {
      const scaledElement = [...document.querySelectorAll<HTMLElement>('[style]')]
        .find(element => element.style.transform.includes('scale('));
      expect(scaledElement?.style.transform).toBe('translateY(6.112012987012987px) scale(0.488961038961039)');
    } finally {
      rendered.unmount();
      vi.unstubAllGlobals();
    }
  });

  test('keeps the workspace wide on short landscape screens while retaining the sidebar toggle', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 844 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 390 });

    const rendered = render(<App />);
    try {
      expect(screen.getByTitle('Show Sidebar')).toBeInTheDocument();
    } finally {
      rendered.unmount();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });
});
