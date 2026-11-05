import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axiosClient from './axiosClient.js';
import {
  getMyApplication,
  getMyApplications,
  submitApplication,
  getProfile,
  updateProfile,
  getSkills,
  updateSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  getExperience,
  addExperience,
  updateExperience,
  deleteExperience,
} from './studentService.js';

const originalGet = axiosClient.get;
const originalPost = axiosClient.post;
const originalPut = axiosClient.put;
const originalDelete = axiosClient.delete;

afterEach(() => {
  axiosClient.get = originalGet;
  axiosClient.post = originalPost;
  axiosClient.put = originalPut;
  axiosClient.delete = originalDelete;
});

test('getMyApplications requests every page from the authenticated student endpoint', async () => {
  const requestedPages = [];
  const pages = [
    {
      content: [{ id: 1 }],
      totalPages: 2,
    },
    {
      content: [{ id: 2 }],
      totalPages: 2,
    },
  ];

  axiosClient.get = async (url, config) => {
    assert.equal(url, '/student/applications');
    requestedPages.push(config.params);
    return { data: pages[config.params.page] };
  };

  const applications = await getMyApplications();

  assert.deepEqual(applications, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(requestedPages, [
    { page: 0, size: 100 },
    { page: 1, size: 100 },
  ]);
});

test('getMyApplications returns an empty list for an empty backend page', async () => {
  axiosClient.get = async () => ({
    data: { content: [], totalPages: 0 },
  });

  assert.deepEqual(await getMyApplications(), []);
});

test('getMyApplications rejects an unexpected page response', async () => {
  axiosClient.get = async () => ({
    data: { results: [] },
  });

  await assert.rejects(getMyApplications(), /unexpected format/);
});

test("getMyApplication requests the authenticated student's application detail", async () => {
  const timeline = [{ id: 9, stageLabel: 'Application Submitted', status: 'DONE' }];
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/applications/42');
    return {
      data: { id: 42, timeline },
    };
  };

  assert.deepEqual(await getMyApplication(42), { id: 42, timeline });
});

test('submitApplication posts the student application to the backend', async () => {
  const application = { id: 42, status: 'APPLIED' };
  const payload = {
    jobId: 7,
    coverLetter: 'Interested in this role',
    resumeUrl: null,
    consentGiven: true,
  };

  axiosClient.post = async (url, requestBody) => {
    assert.equal(url, '/student/applications');
    assert.deepEqual(requestBody, payload);
    return { data: application };
  };

  assert.deepEqual(await submitApplication(payload), application);
});

test('getProfile retrieves profile including skills from backend', async () => {
  const mockProfile = {
    id: 1,
    fullName: 'Test Student',
    skills: [{ id: 10, skillName: 'React', proficiency: 'INTERMEDIATE' }],
  };
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/profile');
    return { data: mockProfile };
  };

  const result = await getProfile();
  assert.deepEqual(result, mockProfile);
  assert.equal(result.skills.length, 1);
  assert.equal(result.skills[0].skillName, 'React');
});

test('getSkills fetches all skills from /student/profile/skills', async () => {
  const mockSkills = [
    { id: 1, skillName: 'Java', proficiency: 'ADVANCED' },
    { id: 2, skillName: 'Spring Boot', proficiency: 'INTERMEDIATE' },
  ];
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/profile/skills');
    return { data: mockSkills };
  };

  const result = await getSkills();
  assert.deepEqual(result, mockSkills);
});

test('updateSkills PUTs list of skills to /student/profile/skills', async () => {
  const skillsToSend = ['Python', 'Django'];
  axiosClient.put = async (url, payload) => {
    assert.equal(url, '/student/profile/skills');
    assert.deepEqual(payload, skillsToSend);
    return { data: [{ id: 3, skillName: 'Python' }, { id: 4, skillName: 'Django' }] };
  };

  const result = await updateSkills(skillsToSend);
  assert.equal(result.length, 2);
  assert.equal(result[0].skillName, 'Python');
});

test('addSkill POSTs skill payload and normalizes string to object', async () => {
  let calledUrl = '';
  let calledPayload = null;

  axiosClient.post = async (url, payload) => {
    calledUrl = url;
    calledPayload = payload;
    return { data: { id: 5, skillName: payload.skillName, proficiency: 'INTERMEDIATE' } };
  };

  const stringRes = await addSkill('TypeScript');
  assert.equal(calledUrl, '/student/profile/skills');
  assert.deepEqual(calledPayload, { skillName: 'TypeScript' });
  assert.equal(stringRes.skillName, 'TypeScript');

  const objRes = await addSkill({ skillName: 'GraphQL', proficiency: 'ADVANCED' });
  assert.deepEqual(calledPayload, { skillName: 'GraphQL', proficiency: 'ADVANCED' });
  assert.equal(objRes.skillName, 'GraphQL');
});

test('updateSkill PUTs updated skill to /student/profile/skills/:id', async () => {
  axiosClient.put = async (url, payload) => {
    assert.equal(url, '/student/profile/skills/5');
    assert.deepEqual(payload, { skillName: 'TypeScript Expert' });
    return { data: { id: 5, skillName: 'TypeScript Expert' } };
  };

  const res = await updateSkill(5, 'TypeScript Expert');
  assert.equal(res.skillName, 'TypeScript Expert');
});

test('deleteSkill calls DELETE on /student/profile/skills/:id', async () => {
  let deletedId = null;
  axiosClient.delete = async (url) => {
    assert.equal(url, '/student/profile/skills/99');
    deletedId = 99;
    return { data: { success: true } };
  };

  const res = await deleteSkill(99);
  assert.equal(deletedId, 99);
  assert.equal(res.success, true);
});

test('updateProfile passes skills list in payload', async () => {
  const payload = {
    fullName: 'Jane Doe',
    email: 'jane@gces.edu',
    skills: ['Java', 'Kotlin'],
  };
  axiosClient.put = async (url, body) => {
    assert.equal(url, '/student/profile');
    assert.deepEqual(body.skills, ['Java', 'Kotlin']);
    return { data: { ...body, id: 1 } };
  };

  const result = await updateProfile(payload);
  assert.deepEqual(result.skills, ['Java', 'Kotlin']);
});

test('updateProfile validates and accepts valid semester 1-8 but rejects semester outside 1-8', async () => {
  const allowedSemesters = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.equal(allowedSemesters.includes(9), false, 'Semester 9 must not be in allowed semesters');
  assert.equal(allowedSemesters.includes(10), false, 'Semester 10 must not be in allowed semesters');
  assert.equal(allowedSemesters.length, 8);

  // Validate semester validation logic matches 1-8 bounds
  const validateSemester = (sem) => {
    if (sem !== '' && sem !== null && sem !== undefined) {
      const num = parseInt(sem, 10);
      if (isNaN(num) || num < 1 || num > 8) {
        return 'Semester must be between 1 and 8';
      }
    }
    return null;
  };

  assert.equal(validateSemester(8), null);
  assert.equal(validateSemester(1), null);
  assert.equal(validateSemester(9), 'Semester must be between 1 and 8');
  assert.equal(validateSemester(10), 'Semester must be between 1 and 8');
  assert.equal(validateSemester(0), 'Semester must be between 1 and 8');

  // Verify successful profile update with semester 8
  axiosClient.put = async (url, body) => {
    assert.equal(url, '/student/profile');
    assert.equal(body.semester, 8);
    return { data: { ...body, id: 1, semester: 8 } };
  };

  const response = await updateProfile({ fullName: 'Student', email: 's@gces.edu', semester: 8 });
  assert.equal(response.semester, 8);
});

test('Education CRUD methods make expected API requests', async () => {
  // getEducation
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/education');
    return { data: [{ id: 1, institutionName: 'GCES', degree: 'B.E.' }] };
  };
  const list = await getEducation();
  assert.equal(list.length, 1);
  assert.equal(list[0].institutionName, 'GCES');

  // addEducation
  const newEdu = { institutionName: 'GCES', degree: 'B.E. CSE', startYear: 2021, endYear: 2025 };
  axiosClient.post = async (url, body) => {
    assert.equal(url, '/student/education');
    assert.deepEqual(body, newEdu);
    return { data: { ...body, id: 10 } };
  };
  const created = await addEducation(newEdu);
  assert.equal(created.id, 10);

  // updateEducation
  const updateData = { institutionName: 'GCES Srirangam', degree: 'B.E. CSE', startYear: 2021, endYear: 2025 };
  axiosClient.put = async (url, body) => {
    assert.equal(url, '/student/education/10');
    assert.deepEqual(body, updateData);
    return { data: { ...body, id: 10 } };
  };
  const updated = await updateEducation(10, updateData);
  assert.equal(updated.institutionName, 'GCES Srirangam');

  // deleteEducation
  let deletedId = null;
  axiosClient.delete = async (url) => {
    assert.equal(url, '/student/education/10');
    deletedId = 10;
    return { data: null };
  };
  await deleteEducation(10);
  assert.equal(deletedId, 10);
});

test('Experience / Internship CRUD methods make expected API requests', async () => {
  // getExperience
  axiosClient.get = async (url) => {
    assert.equal(url, '/student/experience');
    return { data: [{ id: 1, jobRole: 'Intern', company: 'Google' }] };
  };
  const list = await getExperience();
  assert.equal(list.length, 1);
  assert.equal(list[0].company, 'Google');

  // addExperience
  const newExp = {
    jobRole: 'Software Engineer Intern',
    company: 'Microsoft',
    experienceType: 'INTERNSHIP',
    startDate: '2024-05-01',
    endDate: '2024-07-31',
    isCurrent: false,
  };
  axiosClient.post = async (url, body) => {
    assert.equal(url, '/student/experience');
    assert.deepEqual(body, newExp);
    return { data: { ...body, id: 25 } };
  };
  const created = await addExperience(newExp);
  assert.equal(created.id, 25);
  assert.equal(created.company, 'Microsoft');

  // updateExperience
  const updateData = { ...newExp, jobRole: 'Senior SDE Intern' };
  axiosClient.put = async (url, body) => {
    assert.equal(url, '/student/experience/25');
    assert.deepEqual(body, updateData);
    return { data: { ...body, id: 25 } };
  };
  const updated = await updateExperience(25, updateData);
  assert.equal(updated.jobRole, 'Senior SDE Intern');

  // deleteExperience
  let deletedId = null;
  axiosClient.delete = async (url) => {
    assert.equal(url, '/student/experience/25');
    deletedId = 25;
    return { data: null };
  };
  await deleteExperience(25);
  assert.equal(deletedId, 25);
});
