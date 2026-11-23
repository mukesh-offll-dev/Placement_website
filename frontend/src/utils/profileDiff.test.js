import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  comparableValue,
  diffList,
  diffProfile,
  diffSection,
  DIFF_SECTIONS,
  formatDiffValue,
  officialChangedSinceSubmit,
} from './profileDiff.js';

const skills = DIFF_SECTIONS.find((s) => s.key === 'SKILLS');

test('comparableValue treats blanks alike and numbers by value', () => {
  assert.equal(comparableValue(null), comparableValue(''));
  assert.equal(comparableValue('8.50'), comparableValue(8.5));
  assert.equal(comparableValue(['React', 'Java']), 'React|Java');
  assert.equal(comparableValue(false), comparableValue(null));
});

test('diffSection reports changed personal fields only', () => {
  const d = diffSection('PERSONAL', { personal: { fullName: 'Asha', phone: '9000000000' } }, { personal: { fullName: 'Asha', phone: '9111111111', githubUrl: 'https://github.com/asha' } });
  assert.equal(d.changed, true);
  const changed = d.fields.filter((f) => f.changed).map((f) => f.name);
  assert.deepEqual(changed, ['phone', 'githubUrl']);
});

test('diffSection on identical academic data is unchanged', () => {
  const d = diffSection('ACADEMIC', { academic: { cgpa: 8.5, totalBacklogs: 0 } }, { academic: { cgpa: '8.50', totalBacklogs: 0 } });
  assert.equal(d.changed, false);
});

test('diffList pairs by id, then by natural key, and finds added/removed/changed', () => {
  const before = [
    { id: 1, skillName: 'Java', proficiency: 'INTERMEDIATE' },
    { id: 2, skillName: 'SQL', proficiency: 'BEGINNER' },
    { id: 3, skillName: 'Go', proficiency: 'BEGINNER' },
  ];
  const after = [
    { id: 1, skillName: 'Java', proficiency: 'ADVANCED' }, // changed
    { skillName: 'SQL', proficiency: 'BEGINNER' }, // re-added without id: paired with the official SQL row
    { skillName: 'React', proficiency: 'BEGINNER' }, // added
  ];
  const { items, counts } = diffList(skills, before, after);
  assert.deepEqual(counts, { added: 1, removed: 1, changed: 1, unchanged: 1 });
  assert.deepEqual(items.map((i) => i.status), ['changed', 'unchanged', 'added', 'removed']);
  assert.equal(items[3].before.skillName, 'Go');
  assert.deepEqual(items[0].fields.filter((f) => f.changed).map((f) => f.name), ['proficiency']);
});

test('diffList handles missing lists', () => {
  const { items, counts } = diffList(skills, undefined, null);
  assert.equal(items.length, 0);
  assert.deepEqual(counts, { added: 0, removed: 0, changed: 0, unchanged: 0 });
});

test('project tech stack changes are detected', () => {
  const d = diffSection(
    'PROJECTS',
    { projects: [{ id: 7, title: 'Portal', techStack: ['React'] }] },
    { projects: [{ id: 7, title: 'Portal', techStack: ['React', 'Spring'] }] }
  );
  assert.equal(d.counts.changed, 1);
  assert.deepEqual(d.items[0].fields.filter((f) => f.changed).map((f) => f.name), ['techStack']);
});

test('diffProfile orders changed sections first, honouring the backend list', () => {
  const before = { personal: { fullName: 'A' }, skills: [] };
  const after = { personal: { fullName: 'B' }, skills: [{ skillName: 'Java' }] };
  const result = diffProfile(before, after, ['SKILLS', 'PERSONAL']);
  assert.deepEqual(result.slice(0, 2).map((s) => s.key), ['SKILLS', 'PERSONAL']);
  assert.ok(result.slice(2).every((s) => !s.changed));
  assert.equal(result.length, DIFF_SECTIONS.length);
});

test('officialChangedSinceSubmit compares the submit snapshot with the current official data', () => {
  assert.equal(officialChangedSinceSubmit({ academic: { cgpa: 8 } }, { academic: { cgpa: 8 } }), false);
  assert.equal(officialChangedSinceSubmit({ academic: { cgpa: 8 } }, { academic: { cgpa: 9 } }), true);
  assert.equal(officialChangedSinceSubmit(null, {}), false);
});

test('formatDiffValue renders enums, booleans and blanks', () => {
  assert.equal(formatDiffValue('ID_PROOF'), 'Id proof');
  assert.equal(formatDiffValue(true), 'Yes');
  assert.equal(formatDiffValue(''), '—');
  assert.equal(formatDiffValue(['a', 'b']), 'a, b');
});
