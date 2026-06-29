import Papa from 'papaparse';

const SHEET_ID = import.meta.env.VITE_SHEET_ID || '10xqeue5r3q3XkGrLYgXpZEPxAwxGRwDe87Pndnz3Mvs';
const SHEET_GID = import.meta.env.VITE_SHEET_GID || '0';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const CACHE_KEY = 'gpa-dashboard-cache';
const CACHE_TTL_MS = 1000 * 60 * 10;

const normalizeRow = (row) => {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key.trim().replace(/^"|"$/g, '');
    normalized[normalizedKey] = value ?? '';
  });
  return normalized;
};

const validateSheetSchema = (rows, requiredColumns = ['Reg ID', 'Reg. No']) => {
  if (!Array.isArray(rows) || rows.length === 0) return { valid: false, missingColumns: requiredColumns };
  const headers = new Set(Object.keys(rows[0] || {}));
  const missingColumns = requiredColumns.filter((column) => !headers.has(column));
  return { valid: missingColumns.length === 0, missingColumns };
};

const readCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (rows, timestamp) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rows, timestamp }));
  } catch {
    // ignore storage issues
  }
};

export const fetchSheetData = async ({ forceRefresh = false } = {}) => {
  const cached = !forceRefresh ? readCache() : null;
  if (cached?.rows) {
    return {
      rows: cached.rows,
      source: 'cache',
      timestamp: cached.timestamp,
      schemaValid: true,
    };
  }

  const response = await fetch(CSV_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load batch data from Google Sheets.');
  }

  const csvText = await response.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors?.length) {
    console.warn('Sheet parse warnings', parsed.errors);
  }

  const rows = (parsed.data || []).map(normalizeRow).filter((row) => Object.values(row).some((value) => String(value).trim()));
  const schema = validateSheetSchema(rows);
  writeCache(rows, Date.now());

  return {
    rows,
    source: 'network',
    timestamp: Date.now(),
    schemaValid: schema.valid,
    missingColumns: schema.missingColumns,
  };
};
