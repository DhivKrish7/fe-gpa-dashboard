import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBatchStats } from '../services/api';

const DEFAULT_ERROR_MESSAGE = 'Unable to load GPA data. Please try again later.';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const useDashboardData = (selectedStudentId = '', options = {}) => {
  const [rows, setRows] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [batchStats, setBatchStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [source, setSource] = useState('loading');
  const [schemaValid, setSchemaValid] = useState(true);
  const [missingColumns, setMissingColumns] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const targetGPA = options.targetGPA;
  const overrides = options.overrides || {};
  const overrideKey = useMemo(() => JSON.stringify(overrides), [overrides]);
  const intervalRef = useRef(null);

  const loadData = async (isMounted = () => true) => {
    setLoading(true);
    setError(null);

    try {
      const batchData = await fetchBatchStats({
        targetGPA,
        studentId: selectedStudentId,
        overrides,
      });

      if (!isMounted()) return;

      const studentRows = Array.isArray(batchData?.students) ? batchData.students : [];
      setRows(studentRows);
      setLeaderboard(Array.isArray(batchData?.leaderboard) ? batchData.leaderboard : []);
      setBatchStats(batchData || null);
      setLastSyncedAt(new Date().toISOString());
      setLastUpdatedAt(batchData?.updatedAt ?? null);
      setSource('api');
      setSchemaValid(true);
      setMissingColumns([]);
    } catch (err) {
      if (!isMounted()) return;
      setError(err.message || DEFAULT_ERROR_MESSAGE);
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    let mounted = true;
    loadData(() => mounted);

    return () => {
      mounted = false;
    };
  }, [refreshKey, selectedStudentId, overrideKey]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      loadData(() => true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedStudentId, overrideKey, targetGPA]);

  const allIds = useMemo(() => {
    const ids = rows.map((row) => row.id || '').filter(Boolean);
    return [...new Set(ids)].sort();
  }, [rows]);

  const studentLookup = useMemo(() => {
    return rows.reduce((acc, row) => {
      if (row.id) acc[row.id] = row;
      return acc;
    }, {});
  }, [rows]);

  return {
    rows,
    batchStats,
    loading,
    error,
    source,
    schemaValid,
    missingColumns,
    lastSyncedAt,
    lastUpdatedAt,
    allIds,
    rankedStudents: leaderboard,
    studentLookup,
    selectedStudent: selectedStudentId ? studentLookup[selectedStudentId] || null : null,
    refreshData,
    refreshKey,
    setRefreshKey,
  };
};
