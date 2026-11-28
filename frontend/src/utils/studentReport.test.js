import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterStudents, summarizeStudents, csvCell, buildStudentsCsv } from './studentReport.js';

const rows = [
  { id: 1, name: 'Asha', rollNo: '8301', dept: 'CSE', cgpa: 8.9, sem: 'Sem 7', status: 'PLACED', placedCompany: 'Google', placedCtc: 2400000, placedOn: '2026-11-14', email: 'a@x.in', profile: 95 },
  { id: 2, name: 'Bala', rollNo: '8302', dept: 'ECE', cgpa: 7.2, sem: 'N/A', status: 'PENDING', email: 'b@x.in', profile: 60 },
  { id: 3, name: '=cmd|calc', rollNo: '8303', dept: 'CSE', cgpa: 0, sem: 'Sem 5', status: 'ACTIVE', email: '', profile: 0 },
];

describe('Student report', () => {
  it('filters by search, department, CGPA and placement together', () => {
    assert.equal(filterStudents(rows).length, 3);
    assert.deepEqual(filterStudents(rows, { dept: 'cse' }).map((s) => s.id), [1, 3]);
    assert.deepEqual(filterStudents(rows, { cgpa: '8' }).map((s) => s.id), [1]);
    assert.deepEqual(filterStudents(rows, { placement: 'NOT_PLACED' }).map((s) => s.id), [2, 3]);
    assert.deepEqual(filterStudents(rows, { search: '8302' }).map((s) => s.id), [2]);
    assert.equal(filterStudents(rows, { dept: 'CSE', placement: 'PLACED', cgpa: '9' }).length, 0);
  });

  it('counts the cards from whatever rows it is given', () => {
    assert.deepEqual(summarizeStudents(rows), { total: 3, placed: 1, notPlaced: 2 });
    assert.deepEqual(summarizeStudents(filterStudents(rows, { dept: 'ECE' })), { total: 1, placed: 0, notPlaced: 1 });
    assert.deepEqual(summarizeStudents(null), { total: 0, placed: 0, notPlaced: 0 });
  });

  it('escapes CSV cells and neutralises spreadsheet formulas', () => {
    assert.equal(csvCell('plain'), 'plain');
    assert.equal(csvCell('a,b'), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
    assert.equal(csvCell('+1'), "'+1");
    assert.equal(csvCell(null), '');
  });

  it('builds a report with company and CTC only for placed students', () => {
    const csv = buildStudentsCsv(rows);
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    assert.equal(lines.length, 4);
    assert.match(lines[0], /^Register No,Name,Department/);
    assert.match(lines[1], /Placed,Google,₹24 LPA,2026-11-14$/);
    assert.match(lines[2], /Not placed,,,$/);
    assert.match(lines[3], /'=cmd\|calc/);
  });
});
