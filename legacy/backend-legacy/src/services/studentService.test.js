const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');

const servicePath = require.resolve('./studentService');
const requiredCourses = ['FE 1021', 'FE 1022', 'FE 1023', 'FE 1024', 'FE 1025', 'FE 1026', 'FE 1027', 'FE 1028', 'FE 1029', 'FE 1030'];

const makeStudent = (id, name, grade) => ({
  id,
  name,
  gpa: null,
  grades: Object.fromEntries(requiredCourses.map((course) => [course, grade])),
  ...Object.fromEntries(requiredCourses.map((course) => [course, grade])),
});

test('studentService computes GPA analytics, ranking, and forecast in the backend', async () => {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './googleSheetsService') {
      return {
        getStudents: async () => [
          makeStudent('001', 'Ada', 'A'),
          makeStudent('002', 'Ben', 'B'),
          makeStudent('003', 'Cara', 'C'),
        ],
        getRows: async () => [
          makeStudent('001', 'Ada', 'A'),
          makeStudent('002', 'Ben', 'B'),
          makeStudent('003', 'Cara', 'C'),
        ],
      };
    }

    return originalLoad.apply(this, arguments);
  };

  delete require.cache[servicePath];
  const service = require('./studentService');

  try {
    const studentIds = await service.getStudentIds();
    assert.deepEqual(studentIds, ['001', '002', '003']);

    const student = await service.getStudentById('002', { targetGPA: 3.5 });
    assert.equal(student.id, '002');
    assert.equal(student.stats.overall.gpa, 3);
    assert.equal(student.stats.levelOne.gpa, 3);
    assert.equal(student.stats.semesters[0].gpa, 3);
    assert.equal(student.stats.rank, 2);
    assert.equal(student.stats.percentile, 67);
    assert.equal(student.stats.degreeClassification.label, 'Second Lower');
    assert.equal(student.analytics.academicHealth.score, 75);
    assert.equal(student.analytics.strongestSubject.code, 'FE 1021');
    assert.equal(student.analytics.weakestSubject.code, 'FE 1021');
    assert.equal(student.analytics.consistencyScore, 100);
    assert.equal(student.stats.forecast.targetGPA, 3.5);
    assert.equal(student.stats.forecast.remainingCredits, 70);

    const leaderboard = await service.getLeaderboard();
    assert.deepEqual(leaderboard.map((entry) => entry.id), ['001', '002', '003']);
    assert.equal(leaderboard[0].gpa, 4);
    assert.equal(leaderboard[0].semesterGpas.level1Semester1, 4);

    const batch = await service.getBatchStatistics({ selectedStudentId: '002' });
    assert.equal(batch.totalStudents, 3);
    assert.equal(batch.averageGpa, 3);
    assert.equal(batch.passRate, 100);
    assert.equal(batch.leaderboard[1].id, '002');
    assert.equal(batch.distribution.some((bucket) => bucket.isMe), true);

    const subjects = await service.getSubjectAnalytics();
    assert.equal(subjects.find((subject) => subject.code === 'FE 1021').averagePoints, 3);
  } finally {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }
});

test('studentService applies selected-student grade overrides on the backend', async () => {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './googleSheetsService') {
      return {
        getStudents: async () => [
          makeStudent('001', 'Ada', 'A'),
          makeStudent('002', 'Ben', 'B'),
        ],
      };
    }

    return originalLoad.apply(this, arguments);
  };

  delete require.cache[servicePath];
  const service = require('./studentService');

  try {
    const student = await service.getStudentById('002', {
      targetGPA: 3.75,
      overrides: {
        'FE 1021': 'A',
        'FE 1022': 'A',
      },
    });

    assert.equal(student.stats.overall.gpa, 3.2);
    assert.equal(student.stats.semesters[0].gpa, 3.4);
    assert.equal(student.stats.rank, 2);
  } finally {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }
});
