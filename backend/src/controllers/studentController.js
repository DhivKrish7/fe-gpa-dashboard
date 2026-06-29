const studentService = require('../services/studentService');

const parseTargetGPA = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const parseOverrides = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const getAnalyticsOptions = (req) => ({
  targetGPA: parseTargetGPA(req.query.targetGPA),
  selectedStudentId: req.query.studentId || req.params.id,
  overrides: parseOverrides(req.query.overrides),
});

const sendError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    error: statusCode >= 500 ? fallbackMessage : error.publicMessage || error.message,
    ...(error.code ? { code: error.code } : {}),
    ...(error.details ? { details: error.details } : {}),
    ...(error.issueCount ? { issueCount: error.issueCount } : {}),
  });
};

const getStudents = async (req, res) => {
  try {
    const students = await studentService.getStudentIds();
    res.json(students);
  } catch (error) {
    sendError(res, error, 'Unable to fetch students.');
  }
};

const getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id, getAnalyticsOptions(req));
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    return res.json(student);
  } catch (error) {
    return sendError(res, error, 'Unable to fetch student.');
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await studentService.getLeaderboard(getAnalyticsOptions(req));
    res.json(leaderboard);
  } catch (error) {
    sendError(res, error, 'Unable to fetch leaderboard.');
  }
};

const getBatch = async (req, res) => {
  try {
    const batch = await studentService.getBatchStatistics(getAnalyticsOptions(req));
    res.json(batch);
  } catch (error) {
    sendError(res, error, 'Unable to fetch batch statistics.');
  }
};

const getSubjects = async (req, res) => {
  try {
    const subjects = await studentService.getSubjectAnalytics(getAnalyticsOptions(req));
    res.json(subjects);
  } catch (error) {
    sendError(res, error, 'Unable to fetch subject analytics.');
  }
};

module.exports = {
  getStudents,
  getStudentById,
  getLeaderboard,
  getBatch,
  getSubjects,
};
