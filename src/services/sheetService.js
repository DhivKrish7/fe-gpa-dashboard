import { fetchBatchStats } from './api';

export const fetchSheetData = async () => {
  const batch = await fetchBatchStats();
  return {
    rows: Array.isArray(batch?.students) ? batch.students : [],
    source: 'api',
    timestamp: Date.now(),
    schemaValid: true,
    missingColumns: [],
  };
};
