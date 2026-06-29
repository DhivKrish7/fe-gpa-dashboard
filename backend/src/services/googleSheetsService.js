const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { parseSheetValues, validateSheetRows } = require('../validation/sheetValidator');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT || 'gpa-dashboard-500907-29492e7e96f2.json';
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../../', SERVICE_ACCOUNT_FILE);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'A:Z';
const CACHE_TTL_MS = 300 * 1000;

let authClientCache = null;
let sheetRowsCache = null;
let sheetRowsCacheTimestamp = 0;

const readServiceAccount = () => {
  try {
    const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
    const credentials = JSON.parse(raw);

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Service account file is missing required authentication fields.');
    }

    return credentials;
  } catch (error) {
    throw new Error(`Unable to load Google service account credentials from ${SERVICE_ACCOUNT_FILE}.`);
  }
};

const getAuthClient = async () => {
  if (authClientCache) {
    return authClientCache;
  }

  const credentials = readServiceAccount();

  authClientCache = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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
  if (!SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not configured.');
  }

  const now = Date.now();
  if (sheetRowsCache && now - sheetRowsCacheTimestamp < CACHE_TTL_MS) {
    return sheetRowsCache;
  }

  let values;
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    values = response?.data?.values || [];
  } catch (error) {
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
