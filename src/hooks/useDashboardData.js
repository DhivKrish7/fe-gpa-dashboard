import { useEffect, useMemo, useState } from 'react';
import { fetchBatchStats } from '../services/api';

export const useDashboardData = (selectedStudentId = '', options = {}) => {
  const [rows, setRows] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [batchStats, setBatchStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [source, setSource] = useState('loading');
  const [schemaValid, setSchemaValid] = useState(true);
  const [missingColumns, setMissingColumns] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const targetGPA = options.targetGPA;
  const overrides = options.overrides || {};
  const overrideKey = useMemo(() => JSON.stringify(overrides), [overrides]);

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
      setSource('api');
      setSchemaValid(true);
      setMissingColumns([]);
    } catch (err) {
      if (!isMounted()) return;
      setError(err.message || 'Unable to fetch batch data.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  useEffect(() => {
    let mounted = true;
    loadData(() => mounted);

    return () => {
      mounted = false;
    };
  }, [refreshKey, selectedStudentId, targetGPA, overrideKey]);

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
    allIds,
    rankedStudents: leaderboard,
    studentLookup,
    selectedStudent: selectedStudentId ? studentLookup[selectedStudentId] || null : null,
    refreshData,
    refreshKey,
    setRefreshKey,
  };
};
