const assert = require('node:assert/strict');
const test = require('node:test');
const {
  SheetValidationError,
  parseSheetValues,
  validateRegistrationIdParam,
  validateSheetRows,
} = require('./sheetValidator');

const validHeaders = ['Reg ID', 'Name', 'GPA', 'FE 1021', 'FE 1022', 'FE 1023', 'FE 1024', 'FE 1025', 'FE 1026', 'FE 1027', 'FE 1028', 'FE 1029', 'FE 1030'];

test('parseSheetValues accepts valid sheet rows', () => {
  const rows = parseSheetValues([
    validHeaders,
    ['001', 'Ada', '3.9', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D'],
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Reg ID'], '001');
});

test('parseSheetValues reports missing required columns', () => {
  assert.throws(
    () => parseSheetValues([
      ['Name', 'GPA', 'FE 1021'],
      ['Ada', '3.9', 'A'],
    ]),
    (error) => {
      assert.equal(error instanceof SheetValidationError, true);
      assert.equal(error.statusCode, 422);
      assert.equal(error.details.some((issue) => issue.type === 'missing_column' && issue.column.includes('Reg ID')), true);
      return true;
    },
  );
});

test('validateSheetRows reports invalid grades, null GPA, malformed IDs, and missing credits', () => {
  assert.throws(
    () => validateSheetRows([
      { 'Reg ID': '', GPA: '', 'FE 1021': 'A', 'MTH101': 'B' },
      { 'Reg ID': '002', GPA: '3.2', 'FE 1021': 'Z' },
    ]),
    (error) => {
      const types = error.details.map((issue) => issue.type);
      assert.equal(error instanceof SheetValidationError, true);
      assert.equal(types.includes('invalid_registration_id'), true);
      assert.equal(types.includes('null_gpa'), true);
      assert.equal(types.includes('invalid_grade'), true);
      assert.equal(types.includes('missing_credits'), true);
      return true;
    },
  );
});

test('validateSheetRows reports duplicate registration IDs', () => {
  assert.throws(
    () => validateSheetRows([
      { 'Reg ID': '001', GPA: '3.9', 'FE 1021': 'A' },
      { 'Reg ID': '001', GPA: '3.7', 'FE 1021': 'B+' },
    ]),
    (error) => {
      assert.equal(error.details.some((issue) => issue.type === 'duplicate_registration_id'), true);
      return true;
    },
  );
});

test('parseSheetValues reports malformed rows with extra cells', () => {
  assert.throws(
    () => parseSheetValues([
      validHeaders,
      ['001', 'Ada', '3.9', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'unexpected'],
    ]),
    (error) => {
      assert.equal(error.details.some((issue) => issue.type === 'malformed_row'), true);
      return true;
    },
  );
});

test('validateRegistrationIdParam rejects malformed API params', () => {
  assert.throws(() => validateRegistrationIdParam(''), SheetValidationError);
  assert.doesNotThrow(() => validateRegistrationIdParam('FE/2025/001'));
});
