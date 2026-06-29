const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const servicePath = require.resolve('./googleSheetsService');

test('googleSheetsService returns normalized student objects and a leaderboard', async () => {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'googleapis') {
      return {
        google: {
          auth: {
            JWT: class JWT {
              constructor() {
                this.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
              }

              async authorize() {
                return undefined;
              }
            },
          },
          sheets: () => ({
            spreadsheets: {
              values: {
                get: async ({ spreadsheetId, range }) => ({
                  spreadsheetId,
                  range,
                  data: {
                    values: [
                      ['Reg ID', 'Name', 'GPA', 'FE 1021', 'FE 1022', 'FE 1023', 'FE 1024', 'FE 1025', 'FE 1026', 'FE 1027', 'FE 1028', 'FE 1029', 'FE 1030'],
                      ['001', 'Ada', '3.9', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'],
                      ['002', 'Ben', '3.7', 'A', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+'],
                    ],
                  },
                }),
              },
            },
          }),
        },
      };
    }

    return originalLoad.apply(this, arguments);
  };

  delete require.cache[servicePath];
  const service = require('./googleSheetsService');

  try {
    const students = await service.getStudents();
    assert.equal(Array.isArray(students), true);
    assert.equal(students[0].id, '001');
    assert.equal(students[0].name, 'Ada');
    assert.equal(students[0].gpa, 3.9);

    const student = await service.getStudentById('002');
    assert.equal(student.name, 'Ben');

    const leaderboard = await service.getLeaderboard();
    assert.deepEqual(leaderboard.map((entry) => entry.id), ['001', '002']);
  } finally {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }
});

test('googleSheetsService caches sheet responses within the TTL window', async () => {
  const originalLoad = Module._load;
  let callCount = 0;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'googleapis') {
      return {
        google: {
          auth: {
            JWT: class JWT {
              constructor() {
                this.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
              }

              async authorize() {
                return undefined;
              }
            },
          },
          sheets: () => ({
            spreadsheets: {
              values: {
                get: async () => {
                  callCount += 1;
                  return {
                    data: {
                      values: [
                        ['Reg ID', 'Name', 'GPA', 'FE 1021', 'FE 1022', 'FE 1023', 'FE 1024', 'FE 1025', 'FE 1026', 'FE 1027', 'FE 1028', 'FE 1029', 'FE 1030'],
                        ['001', 'Ada', '3.9', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'],
                      ],
                    },
                  };
                },
              },
            },
          }),
        },
      };
    }

    return originalLoad.apply(this, arguments);
  };

  delete require.cache[servicePath];
  const service = require('./googleSheetsService');

  try {
    const first = await service.getRows();
    const second = await service.getRows();
    assert.equal(callCount, 1);
    assert.deepEqual(first, second);
  } finally {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }
});
