import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CAMPUS_PHOTOS,
  PRINCIPAL,
  DEPARTMENTS,
  PLACEMENT_RECORDS,
  RECRUITERS,
  OFFICIAL_LINKS,
  TRAINING_EVENTS,
} from './collegeInfo.js';

const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

test('every landing-page image ships in public/', () => {
  for (const src of [...CAMPUS_PHOTOS.map((p) => p.src), PRINCIPAL.photo, '/gces-logo.png']) {
    assert.ok(existsSync(publicDir + src), `missing ${src}`);
  }
});

test('photos have alt text and captions', () => {
  for (const p of CAMPUS_PHOTOS) {
    assert.ok(p.alt && p.caption, p.src);
  }
});

test('external links point to the official site over https', () => {
  const urls = [
    ...DEPARTMENTS.map((d) => d.url),
    ...PLACEMENT_RECORDS.map((r) => r.url),
    ...OFFICIAL_LINKS.map((l) => l.url),
    ...TRAINING_EVENTS.map((e) => e.url),
    PRINCIPAL.url,
  ];
  for (const u of urls) assert.match(u, /^https:\/\/gces\.edu\.in(\/|$)/, u);
});

test('recruiters are de-duplicated', () => {
  assert.equal(new Set(RECRUITERS).size, RECRUITERS.length);
  assert.ok(RECRUITERS.length > 10);
});
