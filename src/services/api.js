const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const DEFAULT_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

const getJson = async (path, { retries = DEFAULT_RETRIES } = {}) => {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      attempt += 1;
      await sleep(250 * attempt);
    }
  }

  throw lastError || new Error('Unable to complete request.');
};

export const fetchStudents = async () => {
  return getJson('/students');
};

export const fetchStudent = async (id, params = {}) => {
  return getJson(`/student/${encodeURIComponent(id)}${buildQueryString(params)}`);
};

export const fetchLeaderboard = async (params = {}) => {
  return getJson(`/leaderboard${buildQueryString(params)}`);
};

export const fetchBatchStats = async (params = {}) => {
  return getJson(`/batch${buildQueryString(params)}`);
};

export const fetchSubjects = async (params = {}) => {
  return getJson(`/subjects${buildQueryString(params)}`);
};
