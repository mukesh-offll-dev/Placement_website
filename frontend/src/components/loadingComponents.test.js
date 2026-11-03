import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import LoadingSpinner from './LoadingSpinner.js';
import {
  Skeleton,
  JobCardSkeleton,
  ApplicationCardSkeleton,
  StatCardSkeleton,
  ProfileSkeleton,
  ListRowSkeleton,
  TableSkeleton,
} from './Skeleton.js';

describe('LoadingSpinner Component Unit Tests', () => {
  it('renders with accessible role="status", aria-live="polite", and hidden status label by default', () => {
    const html = renderToStaticMarkup(React.createElement(LoadingSpinner));

    assert.ok(html.includes('role="status"'), 'Should have role="status"');
    assert.ok(html.includes('aria-live="polite"'), 'Should have aria-live="polite"');
    assert.ok(html.includes('aria-busy="true"'), 'Should have aria-busy="true"');
    assert.ok(html.includes('Loading...'), 'Should contain default screen reader label');
    assert.ok(html.includes('sr-only'), 'Default label should be visually hidden');
    assert.ok(html.includes('animate-spin'), 'Should include spin animation');
    assert.ok(html.includes('motion-reduce:animate-none'), 'Should respect reduced motion');
  });

  it('supports custom size and color props', () => {
    const htmlSm = renderToStaticMarkup(
      React.createElement(LoadingSpinner, { size: 'sm', color: 'white' })
    );
    assert.ok(htmlSm.includes('w-4 h-4'), 'Should apply sm dimension classes');
    assert.ok(htmlSm.includes('text-white'), 'Should apply white text color');

    const htmlLg = renderToStaticMarkup(
      React.createElement(LoadingSpinner, { size: 'lg', color: 'primary' })
    );
    assert.ok(htmlLg.includes('w-8 h-8'), 'Should apply lg dimension classes');
    assert.ok(htmlLg.includes('text-blue-600'), 'Should apply primary blue text color');
  });

  it('renders visible label when showLabel is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(LoadingSpinner, {
        label: 'Saving Project...',
        showLabel: true,
      })
    );
    assert.ok(html.includes('Saving Project...'), 'Should render label text');
    assert.ok(!html.includes('sr-only">Saving Project...</span><span'), 'Should not solely be sr-only');
  });

  it('renders centered and fullPage container layouts', () => {
    const htmlCenter = renderToStaticMarkup(
      React.createElement(LoadingSpinner, { center: true, label: 'Centering...' })
    );
    assert.ok(htmlCenter.includes('justify-center'), 'Centered variant should include justify-center');

    const htmlFull = renderToStaticMarkup(
      React.createElement(LoadingSpinner, { fullPage: true, showLabel: true, label: 'Please wait' })
    );
    assert.ok(htmlFull.includes('min-h-[60vh]'), 'Fullpage variant should have min-h container');
    assert.ok(htmlFull.includes('Please wait'), 'Should render visible label in fullpage mode');
  });
});

describe('Skeleton Components Unit Tests', () => {
  it('Base Skeleton renders aria-hidden="true" and animated pulse styling', () => {
    const html = renderToStaticMarkup(
      React.createElement(Skeleton, { variant: 'circular', className: 'w-10 h-10' })
    );
    assert.ok(html.includes('aria-hidden="true"'), 'Visual placeholder should have aria-hidden="true"');
    assert.ok(html.includes('animate-pulse'), 'Should have pulse animation');
    assert.ok(html.includes('motion-reduce:animate-none'), 'Should respect reduced motion');
    assert.ok(html.includes('rounded-full'), 'Circular variant should have rounded-full');
    assert.ok(html.includes('w-10 h-10'), 'Custom className should be applied');
  });

  it('JobCardSkeleton renders the requested number of job card skeletons with accessible status', () => {
    const html = renderToStaticMarkup(React.createElement(JobCardSkeleton, { count: 3 }));

    assert.ok(html.includes('role="status"'), 'Container should have role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Container should have aria-busy="true"');
    assert.ok(html.includes('Loading job drives...'), 'Should have accessible loading message');

    // Each job card has a rounded-xl logo container placeholder
    const cardMatches = html.match(/w-14 h-14/g) || [];
    assert.strictEqual(cardMatches.length, 3, 'Should render 3 job card logo placeholders');
  });

  it('ApplicationCardSkeleton renders requested count of application skeletons', () => {
    const html = renderToStaticMarkup(React.createElement(ApplicationCardSkeleton, { count: 4 }));

    assert.ok(html.includes('role="status"'), 'Container should have role="status"');
    assert.ok(html.includes('Loading your applications...'), 'Should have accessible loading text');
    const rowMatches = html.match(/w-10 h-10/g) || [];
    assert.strictEqual(rowMatches.length, 4, 'Should render 4 application icon placeholders');
  });

  it('StatCardSkeleton renders 4 stat cards by default in a responsive grid', () => {
    const html = renderToStaticMarkup(React.createElement(StatCardSkeleton));

    assert.ok(html.includes('grid-cols-2 md:grid-cols-4'), 'Should render responsive grid');
    const iconBoxes = html.match(/w-9 h-9/g) || [];
    assert.strictEqual(iconBoxes.length, 4, 'Should render 4 stat card icon boxes');
  });

  it('ProfileSkeleton renders comprehensive profile skeleton layout', () => {
    const html = renderToStaticMarkup(React.createElement(ProfileSkeleton));

    assert.ok(html.includes('role="status"'), 'Should have role="status"');
    assert.ok(html.includes('Loading profile details from server...'), 'Should have accessible text');
    assert.ok(html.includes('w-24 h-24'), 'Should render avatar placeholder');
    assert.ok(html.includes('grid-cols-1 lg:grid-cols-3'), 'Should render two-column profile body grid');
  });

  it('ListRowSkeleton and TableSkeleton render expected structure', () => {
    const htmlList = renderToStaticMarkup(React.createElement(ListRowSkeleton, { count: 3 }));
    assert.ok(htmlList.includes('role="status"'), 'List skeleton should have role="status"');

    const htmlTable = renderToStaticMarkup(React.createElement(TableSkeleton, { rows: 3, cols: 4 }));
    assert.ok(htmlTable.includes('<table'), 'Table skeleton should render table element');
    const thMatches = htmlTable.match(/<th[\s>]/g) || [];
    assert.strictEqual(thMatches.length, 4, 'Should render 4 table headers');
    const trMatches = htmlTable.match(/<tr/g) || [];
    assert.strictEqual(trMatches.length, 4, 'Should render 1 header row + 3 data rows = 4 rows');
  });
});
