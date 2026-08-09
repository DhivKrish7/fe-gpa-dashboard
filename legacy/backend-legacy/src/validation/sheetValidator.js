const { COURSE_CREDITS, REQUIRED_GRADE_COLUMNS, VALID_GRADES } = require('../constants/academicCatalog');

const REGISTRATION_ID_HEADERS = ['Reg ID', 'Reg. No', 'id'];
const GPA_HEADERS = ['GPA', 'gpa', 'GPA Score'];
const OPTIONAL_METADATA_HEADERS = ['Name', 'Student Name', 'Student'];
const METADATA_HEADERS = new Set([...REGISTRATION_ID_HEADERS, ...GPA_HEADERS, ...OPTIONAL_METADATA_HEADERS].map((header) => header.toLowerCase()));
const MAX_DETAILS = 50;

class SheetValidationError extends Error {
  constructor(errors) {
    const issueCount = errors.length;
    super(`Sheet validation failed with ${issueCount} issue${issueCount === 1 ? '' : 's'}.`);
    this.name = 'SheetValidationError';
    this.code = 'SHEET_VALIDATION_FAILED';
    this.statusCode = 422;
    this.publicMessage = this.message;
    this.issueCount = issueCount;
    this.details = errors.slice(0, MAX_DETAILS);
  }
}

const normalizeHeader = (header) => String(header || '').trim();

const normalizeCourseCode = (header) => {
  const normalized = normalizeHeader(header).replace(/\s+/g, ' ').toUpperCase();
  const match = normalized.match(/^FE\s*(\d{4})$/);
  return match ? `FE ${match[1]}` : normalized;
};

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

const trimEmptyTrailingColumns = (values) => {
  if (!Array.isArray(values) || !values.length) return values;

  let lastUsedIndex = -1;
  values.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell, index) => {
      if (!isBlank(cell)) lastUsedIndex = Math.max(lastUsedIndex, index);
    });
  });

  if (lastUsedIndex < 0) return [[]];
  return values.map((row) => (Array.isArray(row) ? row.slice(0, lastUsedIndex + 1) : row));
};

const findHeader = (headers, aliases) => {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  return headers.find((header) => normalizedAliases.includes(header.toLowerCase()));
};

const getCellValue = (row, aliases) => {
  const matchingKey = findHeader(Object.keys(row), aliases);
  return matchingKey ? row[matchingKey] : undefined;
};

const makeIssue = ({ type, message, row, column, value }) => {
  const issue = { type, message };
  if (row !== undefined) issue.row = row;
  if (column !== undefined) issue.column = column;
  if (value !== undefined) issue.value = value;
  return issue;
};

const addMissingHeaderIssues = (errors, headers) => {
  if (!findHeader(headers, REGISTRATION_ID_HEADERS)) {
    errors.push(makeIssue({
      type: 'missing_column',
      column: REGISTRATION_ID_HEADERS.join(' or '),
      message: 'Missing a registration ID column. Expected one of: Reg ID, Reg. No, id.',
    }));
  }

  if (!findHeader(headers, GPA_HEADERS)) {
    errors.push(makeIssue({
      type: 'missing_column',
      column: GPA_HEADERS.join(' or '),
      message: 'Missing a GPA column. Expected one of: GPA, gpa, GPA Score.',
    }));
  }

  REQUIRED_GRADE_COLUMNS.forEach((column) => {
    const hasColumn = headers.some((header) => normalizeCourseCode(header) === normalizeCourseCode(column));
    if (!hasColumn) {
      errors.push(makeIssue({
        type: 'missing_column',
        column,
        message: `Missing required grade column "${column}".`,
      }));
    }
  });
};

const validateRawSheetValues = (values) => {
  const errors = [];

  if (!Array.isArray(values)) {
    throw new SheetValidationError([
      makeIssue({ type: 'malformed_sheet', message: 'Sheet response must be an array of rows.' }),
    ]);
  }

  const trimmedValues = trimEmptyTrailingColumns(values);
  const rawHeaders = trimmedValues[0] || [];
  if (!Array.isArray(rawHeaders) || rawHeaders.every(isBlank)) {
    throw new SheetValidationError([
      makeIssue({ type: 'missing_column', message: 'Sheet must include a header row.' }),
    ]);
  }

  const headers = rawHeaders.map(normalizeHeader);
  const seenHeaders = new Set();

  headers.forEach((header, index) => {
    if (!header) {
      errors.push(makeIssue({
        type: 'missing_column',
        column: `Column ${index + 1}`,
        message: `Column ${index + 1} has data but no header.`,
      }));
      return;
    }

    const normalizedHeader = header.toLowerCase();
    if (seenHeaders.has(normalizedHeader)) {
      errors.push(makeIssue({
        type: 'malformed_sheet',
        column: header,
        message: `Duplicate column "${header}" found in the header row.`,
      }));
    }

    seenHeaders.add(normalizedHeader);
  });

  addMissingHeaderIssues(errors, headers);

  trimmedValues.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (!Array.isArray(row)) {
      errors.push(makeIssue({
        type: 'malformed_row',
        row: rowNumber,
        message: `Row ${rowNumber} must be an array of cell values.`,
      }));
      return;
    }

    if (row.length > headers.length && row.slice(headers.length).some((cell) => !isBlank(cell))) {
      errors.push(makeIssue({
        type: 'malformed_row',
        row: rowNumber,
        message: `Row ${rowNumber} has values beyond the header columns.`,
      }));
    }
  });

  if (errors.length) throw new SheetValidationError(errors);
  return { headers, values: trimmedValues };
};

const parseSheetValues = (values) => {
  const { headers, values: trimmedValues } = validateRawSheetValues(values);
  const rows = trimmedValues
    .slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => !isBlank(cell)))
    .map((row) => headers.reduce((accumulator, header, index) => {
      accumulator[header] = row[index] ?? '';
      return accumulator;
    }, {}));

  validateSheetRows(rows);
  return rows;
};

const isValidRegistrationId = (id) => {
  const trimmed = String(id || '').trim();
  return trimmed.length > 0 && trimmed.length <= 64 && !/[\u0000-\u001f\u007f]/.test(trimmed);
};

const validateRegistrationIdParam = (id) => {
  if (isValidRegistrationId(id)) return;
  throw new SheetValidationError([
    makeIssue({
      type: 'invalid_registration_id',
      message: 'Registration ID must be a non-empty value without control characters.',
      value: id,
    }),
  ]);
};

const isMetadataHeader = (header) => METADATA_HEADERS.has(String(header || '').trim().toLowerCase());

const getGradeColumns = (row) => Object.keys(row).filter((header) => !isMetadataHeader(header));

const validateGpa = (gpaValue, rowNumber, errors) => {
  if (isBlank(gpaValue)) {
    errors.push(makeIssue({
      type: 'null_gpa',
      row: rowNumber,
      column: 'GPA',
      message: `Row ${rowNumber} is missing GPA.`,
    }));
    return;
  }

  const numericGpa = Number(String(gpaValue).trim());
  if (!Number.isFinite(numericGpa) || numericGpa < 0 || numericGpa > 4) {
    errors.push(makeIssue({
      type: 'invalid_gpa',
      row: rowNumber,
      column: 'GPA',
      value: gpaValue,
      message: `Row ${rowNumber} has invalid GPA "${gpaValue}". GPA must be a number from 0 to 4.`,
    }));
  }
};

const validateSheetRows = (rows) => {
  const errors = [];
  const registrationIds = new Map();
  const missingCreditColumns = new Set();

  if (!Array.isArray(rows)) {
    throw new SheetValidationError([
      makeIssue({ type: 'malformed_sheet', message: 'Parsed sheet rows must be an array.' }),
    ]);
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(makeIssue({
        type: 'malformed_row',
        row: rowNumber,
        message: `Row ${rowNumber} must be an object keyed by column name.`,
      }));
      return;
    }

    const registrationId = getCellValue(row, REGISTRATION_ID_HEADERS);
    if (!isValidRegistrationId(registrationId)) {
      errors.push(makeIssue({
        type: 'invalid_registration_id',
        row: rowNumber,
        column: 'Reg ID',
        value: registrationId,
        message: `Row ${rowNumber} has a missing or malformed registration ID.`,
      }));
    } else {
      const normalizedId = String(registrationId).trim().toLowerCase();
      if (registrationIds.has(normalizedId)) {
        errors.push(makeIssue({
          type: 'duplicate_registration_id',
          row: rowNumber,
          column: 'Reg ID',
          value: registrationId,
          message: `Registration ID "${registrationId}" is duplicated on rows ${registrationIds.get(normalizedId)} and ${rowNumber}.`,
        }));
      } else {
        registrationIds.set(normalizedId, rowNumber);
      }
    }

    validateGpa(getCellValue(row, GPA_HEADERS), rowNumber, errors);

    const gradeColumns = getGradeColumns(row);
    const enteredGradeColumns = gradeColumns.filter((column) => !isBlank(row[column]));

    if (!enteredGradeColumns.length) {
      errors.push(makeIssue({
        type: 'malformed_row',
        row: rowNumber,
        message: `Row ${rowNumber} has no grade entries.`,
      }));
    }

    gradeColumns.forEach((column) => {
      const courseCode = normalizeCourseCode(column);
      const credits = COURSE_CREDITS[courseCode];
      const grade = String(row[column] || '').trim().toUpperCase();

      if (!credits || credits <= 0) {
        missingCreditColumns.add(column);
      }

      if (grade && !VALID_GRADES.has(grade)) {
        errors.push(makeIssue({
          type: 'invalid_grade',
          row: rowNumber,
          column,
          value: row[column],
          message: `Row ${rowNumber} has invalid grade "${row[column]}" in "${column}".`,
        }));
      }
    });
  });

  missingCreditColumns.forEach((column) => {
    errors.push(makeIssue({
      type: 'missing_credits',
      column,
      message: `Missing credit metadata for grade column "${column}".`,
    }));
  });

  if (errors.length) throw new SheetValidationError(errors);
  return true;
};

module.exports = {
  REGISTRATION_ID_HEADERS,
  GPA_HEADERS,
  SheetValidationError,
  isValidRegistrationId,
  parseSheetValues,
  validateRegistrationIdParam,
  validateSheetRows,
};
