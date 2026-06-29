const express = require('express');
const studentController = require('../controllers/studentController');
const { validateSheetData, validateStudentIdParam } = require('../middleware/validationMiddleware');

const router = express.Router();

router.get('/students', validateSheetData, studentController.getStudents);
router.get('/student/:id', validateStudentIdParam, validateSheetData, studentController.getStudentById);
router.get('/leaderboard', validateSheetData, studentController.getLeaderboard);
router.get('/batch', validateSheetData, studentController.getBatch);
router.get('/subjects', validateSheetData, studentController.getSubjects);

module.exports = router;
