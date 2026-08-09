const googleSheetsService = require('../services/googleSheetsService');
const { validateRegistrationIdParam } = require('../validation/sheetValidator');

const validateSheetData = async (req, res, next) => {
  try {
    await googleSheetsService.validateSheetData();
    next();
  } catch (error) {
    next(error);
  }
};

const validateStudentIdParam = (req, res, next) => {
  try {
    validateRegistrationIdParam(req.params.id);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateSheetData,
  validateStudentIdParam,
};
