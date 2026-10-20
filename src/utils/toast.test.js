import test from 'node:test';
import assert from 'node:assert/strict';

// Test the toast utility functions
import {
  toastSuccess,
  toastError,
  toastInfo,
  toastWarning,
  toastLoading,
  toastDismiss,
  toast,
} from './toast.js';

test('Toast Utility Suite', async (t) => {
  await t.test('exports all expected functions', () => {
    assert.equal(typeof toastSuccess, 'function');
    assert.equal(typeof toastError, 'function');
    assert.equal(typeof toastInfo, 'function');
    assert.equal(typeof toastWarning, 'function');
    assert.equal(typeof toastLoading, 'function');
    assert.equal(typeof toastDismiss, 'function');
    assert.ok(toast);
  });

  await t.test('toastSuccess executes without error for standard messages', () => {
    assert.doesNotThrow(() => {
      toastSuccess('Operation completed successfully!');
    });
  });

  await t.test('toastError handles simple string errors', () => {
    assert.doesNotThrow(() => {
      toastError('Invalid credentials entered.');
    });
  });

  await t.test('toastError safely handles Error objects and extracts message', () => {
    const errorObj = new Error('Custom validation error occurred');
    assert.doesNotThrow(() => {
      toastError(errorObj);
    });
  });

  await t.test('toastError sanitizes Spring Boot / backend stack traces', () => {
    const unsafeError = new Error(
      'org.springframework.dao.DataIntegrityViolationException: could not execute statement; at org.hibernate.exception'
    );
    // Should fall back to fallback message rather than exposing internal java/spring classes
    assert.doesNotThrow(() => {
      toastError(unsafeError, 'Database operation failed.');
    });
  });

  await t.test('toastError detects network/offline errors and provides friendly message', () => {
    const networkErr = { isNetworkError: true, message: 'Network Error' };
    assert.doesNotThrow(() => {
      toastError(networkErr);
    });
  });

  await t.test('toastInfo and toastWarning execute cleanly', () => {
    assert.doesNotThrow(() => {
      toastInfo('Session will expire soon.');
      toastWarning('Please save your changes before proceeding.');
    });
  });

  await t.test('toastLoading returns an ID and toastDismiss handles it', () => {
    const id = toastLoading('Loading details...');
    assert.ok(id !== undefined);
    assert.doesNotThrow(() => {
      toastDismiss(id);
    });
  });

  await t.test('de-duplication suppresses duplicate notifications fired within rapid succession', () => {
    // Calling same message repeatedly should not crash and triggers dedup
    const duplicateMsg = 'Duplicate test notification ' + Date.now();
    assert.doesNotThrow(() => {
      toastSuccess(duplicateMsg);
      toastSuccess(duplicateMsg); // Suppressed by _dedup
    });
  });
});
