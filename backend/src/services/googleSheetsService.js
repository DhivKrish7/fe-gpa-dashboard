const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { parseSheetValues, validateSheetRows } = require('../validation/sheetValidator');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT || 'gpa-dashboard-500907-29492e7e96f2.json';
const BACKEND_ROOT = path.resolve(__dirname, '../../');
const RANGE = 'A:Z';
const CACHE_TTL_MS = 300 * 1000;
const IS_PRODUCTION = ['production', 'prod'].includes(String(process.env.NODE_ENV || '').toLowerCase());

let authClientCache = null;
let sheetRowsCache = null;
let sheetRowsCacheTimestamp = 0;

const normalizePrivateKey = (privateKey) => {
  return String(privateKey || '').replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '').trim();
};

const getServiceAccountPath = () => {
  const candidatePaths = [
    process.env.GOOGLE_SERVICE_ACCOUNT && path.isAbsolute(process.env.GOOGLE_SERVICE_ACCOUNT)
      ? process.env.GOOGLE_SERVICE_ACCOUNT
      : path.resolve(BACKEND_ROOT, process.env.GOOGLE_SERVICE_ACCOUNT || ''),
    path.resolve(BACKEND_ROOT, 'service-account.json'),
    path.resolve(BACKEND_ROOT, SERVICE_ACCOUNT_FILE),
  ].filter(Boolean);

  return candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) || null;
};

const readServiceAccount = () => {
  const serviceAccountPath = getServiceAccountPath();
  if (!serviceAccountPath) {
    return null;
  }

  try {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    const credentials = JSON.parse(raw);

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Service account file is missing required authentication fields.');
    }

    return credentials;
  } catch (error) {
    throw new Error(`Unable to load Google service account credentials from ${path.basename(serviceAccountPath)}.`);
  }
};

const getEnvironmentCredentials = () => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
    project_id: projectId,
  };
};

const resolveCredentials = () => {
  if (IS_PRODUCTION) {
    const environmentCredentials = getEnvironmentCredentials();
    if (environmentCredentials) {
      return environmentCredentials;
    }

    throw new Error('Google credentials are not configured. Set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID, and GOOGLE_SHEET_ID in your Render environment.');
  }

  const serviceAccountCredentials = readServiceAccount();
  if (serviceAccountCredentials) {
    return serviceAccountCredentials;
  }

  const environmentCredentials = getEnvironmentCredentials();
  if (environmentCredentials) {
    return environmentCredentials;
  }

  throw new Error('Google credentials are not configured. Add backend/service-account.json for local development or set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID, and GOOGLE_SHEET_ID in your deployment environment.');
};

const getAuthClient = async () => {
  if (authClientCache) {
    return authClientCache;
  }

  const credentials = resolveCredentials();

  authClientCache = new google.auth.JWT({
    email: credentials.client_email,
    key: normalizePrivateKey(credentials.private_key),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    ...(credentials.project_id ? { projectId: credentials.project_id } : {}),
  });

  await authClientCache.authorize();
  return authClientCache;
};

const getSheetsClient = async () => {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
};

const parseValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const trimmed = String(value).trim();
  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) ? numericValue : trimmed;
};

const toStudentObject = (row) => {
  const normalizedRow = Object.entries(row).reduce((accumulator, [key, value]) => {
    accumulator[String(key || '').trim()] = value;
    return accumulator;
  }, {});

  const id = normalizedRow['Reg ID'] || normalizedRow['Reg. No'] || normalizedRow['id'] || '';
  const name = normalizedRow['Name'] || normalizedRow['Student Name'] || normalizedRow['Student'] || '';
  const gpa = parseValue(normalizedRow['GPA'] || normalizedRow['gpa'] || normalizedRow['GPA Score']);
  const grades = Object.entries(normalizedRow).reduce((accumulator, [key, value]) => {
    if (['Reg ID', 'Reg. No', 'id', 'Name', 'Student Name', 'Student', 'GPA', 'gpa', 'GPA Score'].includes(key)) {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});

  return {
    id: String(id).trim(),
    name: String(name).trim(),
    gpa: typeof gpa === 'number' ? gpa : null,
    grades,
    ...grades,
  };
};

const readRows = async () => {
  const now = Date.now();
  if (sheetRowsCache && now - sheetRowsCacheTimestamp < CACHE_TTL_MS) {
    return sheetRowsCache;
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured.');
  }

  let values;
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: RANGE,
    });

    values = response?.data?.values || [];
  } catch (error) {
    if (error instanceof Error && /Google credentials|GOOGLE_SHEET_ID/i.test(error.message)) {
      throw error;
    }

    throw new Error('Unable to read student data from Google Sheets.');
  }

  const parsedRows = parseSheetValues(values);
  sheetRowsCache = parsedRows;
  sheetRowsCacheTimestamp = now;
  return parsedRows;
};

const getRows = async () => {
  return readRows();
};

const validateSheetData = async () => {
  const rows = await readRows();
  validateSheetRows(rows);
  return true;
};

const getStudents = async () => {
  const rows = await readRows();
  return rows.map(toStudentObject).filter((student) => student.id || student.name);
};

const getStudentById = async (id) => {
  const students = await getStudents();
  const normalizedId = String(id || '').trim().toLowerCase();
  return students.find((student) => String(student.id).trim().toLowerCase() === normalizedId) || null;
};

const getLeaderboard = async () => {
  const students = await getStudents();
  const rankedStudents = students
    .filter((student) => student.gpa !== null)
    .sort((left, right) => right.gpa - left.gpa)
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

  return rankedStudents;
};

module.exports = {
  getRows,
  getStudents,
  getStudentById,
  getLeaderboard,
  validateSheetData,
};
