import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createEmailService } from './emailService.js';

const CONFIG = { serviceId: 'service_x', templateId: 'template_x', publicKey: 'key_x' };

const mail = (overrides = {}) => ({
  toEmail: 'asha@example.com',
  toName: 'Asha Rao',
  subject: 'Application update: SDE at Zoho',
  message: 'Your application has been shortlisted.',
  ...overrides,
});

describe('emailService', () => {
  let calls;
  let clock;
  let service;

  const build = (send, config = CONFIG, extra = {}) =>
    createEmailService({ config, send, now: () => clock, ...extra });

  beforeEach(() => {
    calls = [];
    clock = 1_000_000;
    service = build(async (...args) => { calls.push(args); return { status: 200 }; });
  });

  it('sends the four template variables with the configured ids', async () => {
    const result = await service.sendEmail(mail());

    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 1);
    const [serviceId, templateId, params, publicKey] = calls[0];
    assert.equal(serviceId, 'service_x');
    assert.equal(templateId, 'template_x');
    assert.equal(publicKey, 'key_x');
    assert.deepEqual(params, {
      to_email: 'asha@example.com',
      to_name: 'Asha Rao',
      subject: 'Application update: SDE at Zoho',
      message: 'Your application has been shortlisted.',
    });
  });

  it('does nothing, and does not fail, when EmailJS is not configured', async () => {
    const off = build(async () => { throw new Error('must not be called'); }, { serviceId: '', templateId: '', publicKey: '' });

    assert.equal(off.isConfigured(), false);
    assert.deepEqual(await off.sendEmail(mail()), { ok: false, skipped: 'not-configured' });
  });

  it('rejects a missing or malformed recipient, subject or message', async () => {
    for (const bad of [{ toEmail: '' }, { toEmail: 'not-an-email' }, { subject: '  ' }, { message: '' }]) {
      const result = await service.sendEmail(mail(bad));
      assert.equal(result.ok, false);
      assert.equal(result.skipped, 'invalid');
    }
    assert.equal(calls.length, 0);
  });

  it('defaults the name and keeps the subject on one line', async () => {
    await service.sendEmail(mail({ toName: '', subject: 'Line one\r\nBcc: x@evil.com' }));

    const params = calls[0][2];
    assert.equal(params.to_name, 'Student');
    assert.ok(!/[\r\n]/.test(params.subject));
  });

  it('drops a double submit while the first send is still in flight', async () => {
    let release;
    const slow = build((...args) => { calls.push(args); return new Promise((resolve) => { release = resolve; }); });

    const first = slow.sendEmail(mail());
    const second = await slow.sendEmail(mail());
    release({ status: 200 });

    assert.deepEqual(second, { ok: false, skipped: 'duplicate' });
    assert.deepEqual(await first, { ok: true });
    assert.equal(calls.length, 1);
  });

  it('drops the same message to the same person for a minute after it was sent, then allows it', async () => {
    assert.equal((await service.sendEmail(mail())).ok, true);
    assert.deepEqual(await service.sendEmail(mail({ toEmail: 'ASHA@example.com' })), { ok: false, skipped: 'duplicate' });
    assert.equal(calls.length, 1);

    clock += 61_000;
    assert.equal((await service.sendEmail(mail())).ok, true);
    assert.equal(calls.length, 2);
  });

  it('sends a different message to the same person', async () => {
    await service.sendEmail(mail());
    assert.equal((await service.sendEmail(mail({ message: 'Now selected.' }))).ok, true);
    assert.equal(calls.length, 2);
  });

  it('turns a provider failure into a result, and allows a retry', async () => {
    let fail = true;
    const flaky = build(async () => { if (fail) throw { status: 429, text: 'Too many requests' }; return {}; });

    const failed = await flaky.sendEmail(mail());
    assert.equal(failed.ok, false);
    assert.match(failed.error, /limit/i);

    fail = false;
    assert.equal((await flaky.sendEmail(mail())).ok, true, 'a failed send is not remembered as sent');
  });

  it('gives up on a send that never answers', async () => {
    const hung = build(() => new Promise(() => {}), CONFIG, { timeoutMs: 20 });

    const result = await hung.sendEmail(mail());

    assert.equal(result.ok, false);
    assert.match(result.error, /too long/i);
  });

  it('the quiet sender never throws, even when the transport does', async () => {
    const broken = build(async () => { throw new Error('network down'); });
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const result = await broken.sendEmailQuietly(mail());
      assert.equal(result.ok, false);
      assert.equal(warnings.length, 1);
    } finally {
      console.warn = originalWarn;
    }
  });
});
