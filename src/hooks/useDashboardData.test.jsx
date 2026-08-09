import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useDashboardData } from './useDashboardData';

const mockFetchResponse = () => ({
  ok: true,
  json: async () => [],
});

const TestComponent = ({ selectedStudentId, targetGPA }) => {
  const { loading, allIds, refreshData } = useDashboardData(selectedStudentId, { targetGPA });
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="ids">{allIds.join(',')}</div>
      <button type="button" onClick={refreshData}>Refresh</button>
    </div>
  );
};

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse()));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('initializes and refreshes data on interval without duplicate timers', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<TestComponent selectedStudentId="" targetGPA={3.7} />);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('triggers an immediate manual refresh when refreshData is called', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<TestComponent selectedStudentId="" targetGPA={3.7} />);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const button = screen.getByRole('button', { name: /refresh/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
