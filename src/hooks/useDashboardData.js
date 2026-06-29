import { useEffect, useMemo, useState } from 'react';
import { fetchSheetData } from '../services/sheetService';
import { computeGPA, calculateNeededGPA, getRankedStudents } from '../utils/gpa';
import { ALL_CODES, L1_COURSES, L2_COURSES, L3_CORE } from '../constants/courses';

export const useDashboardData = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [source, setSource] = useState('loading');
  const [schemaValid, setSchemaValid] = useState(true);
  const [missingColumns, setMissingColumns] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSheetData({ forceRefresh: true });
      setRows(result.rows || []);
      setLastSyncedAt(result.timestamp);
      setSource(result.source);
      setSchemaValid(result.schemaValid);
      setMissingColumns(result.missingColumns || []);
    } catch (err) {
      setError(err.message || 'Unable to fetch batch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const result = await fetchSheetData();
        if (!isMounted) return;
        setRows(result.rows || []);
        setLastSyncedAt(result.timestamp);
        setSource(result.source);
        setSchemaValid(result.schemaValid);
        setMissingColumns(result.missingColumns || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Unable to fetch batch data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const allIds = useMemo(() => {
    return [...new Set(rows.map((row) => row['Reg. No'] || row['Reg ID'] || '').filter(Boolean))].sort();
  }, [rows]);

  const rankedStudents = useMemo(() => getRankedStudents(rows, L1_COURSES), [rows]);

  const studentLookup = useMemo(() => {
    return rows.reduce((acc, row) => {
      const id = row['Reg. No'] || row['Reg ID'];
      if (id) acc[id] = row;
      return acc;
    }, {});
  }, [rows]);

  return {
    rows,
    loading,
    error,
    source,
    schemaValid,
    missingColumns,
    lastSyncedAt,
    allIds,
    rankedStudents,
    studentLookup,
    refreshData,
    refreshKey,
    setRefreshKey,
    courses: { L1_COURSES, L2_COURSES, L3_CORE, ALL_CODES },
  };
};
