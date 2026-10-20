import React from 'react';

const VARIANT_CLASSES = {
  text: 'rounded h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-xl',
};

/**
 * Base Skeleton component.
 * Provides a shimmering/pulsing placeholder element with accessible attributes.
 *
 * @param {Object} props
 * @param {'text'|'circular'|'rectangular'|'rounded'} [props.variant='rounded'] - Shape variant
 * @param {string} [props.className=''] - Tailwind utility classes (e.g., width, height)
 */
export function Skeleton({
  variant = 'rounded',
  className = '',
  ...rest
}) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.rounded;
  return React.createElement('div', {
    'aria-hidden': 'true',
    className: `animate-pulse motion-reduce:animate-none bg-gray-200 dark:bg-gray-700/60 ${variantClass} ${className}`.trim(),
    ...rest,
  });
}

/**
 * Skeleton loader for Job Cards (matches JobsPage.jsx layout).
 *
 * @param {Object} props
 * @param {number} [props.count=5] - Number of skeleton cards to render
 * @param {string} [props.className=''] - Additional container classes
 */
export function JobCardSkeleton({ count = 5, className = '' }) {
  const cards = Array.from({ length: count }, (_, idx) =>
    React.createElement(
      'div',
      {
        key: idx,
        className: 'bg-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4',
      },
      // Company Logo placeholder
      React.createElement(Skeleton, { variant: 'rounded', className: 'w-14 h-14 rounded-xl shrink-0' }),
      // Job Details placeholder
      React.createElement(
        'div',
        { className: 'flex-1 min-w-0 space-y-2' },
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center gap-2' },
          React.createElement(Skeleton, { className: 'h-5 w-40' }),
          React.createElement(Skeleton, { className: 'h-5 w-20 rounded-full' })
        ),
        React.createElement(Skeleton, { className: 'h-4 w-52' }),
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center gap-3 pt-1' },
          React.createElement(Skeleton, { className: 'h-3.5 w-24' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-28' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-16' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-20' })
        )
      ),
      // Action button placeholder
      React.createElement(
        'div',
        { className: 'shrink-0 pt-2 md:pt-0' },
        React.createElement(Skeleton, { className: 'h-9 w-28 rounded-lg' })
      )
    )
  );

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading job drives',
      className: `space-y-4 ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading job drives...'),
    ...cards
  );
}

/**
 * Skeleton loader for Student Application Cards (matches StudentApplicationsPage.jsx layout).
 *
 * @param {Object} props
 * @param {number} [props.count=4] - Number of skeleton rows to render
 * @param {string} [props.className=''] - Additional container classes
 */
export function ApplicationCardSkeleton({ count = 4, className = '' }) {
  const cards = Array.from({ length: count }, (_, idx) =>
    React.createElement(
      'div',
      {
        key: idx,
        className: 'bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
      },
      React.createElement(
        'div',
        { className: 'flex items-start gap-3 min-w-0' },
        React.createElement(Skeleton, { variant: 'rounded', className: 'w-10 h-10 rounded-lg shrink-0' }),
        React.createElement(
          'div',
          { className: 'space-y-1.5 flex-1 min-w-0' },
          React.createElement(Skeleton, { className: 'h-4 w-36' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-48' }),
          React.createElement(
            'div',
            { className: 'flex items-center gap-3 pt-1' },
            React.createElement(Skeleton, { className: 'h-3 w-24' }),
            React.createElement(Skeleton, { className: 'h-3 w-28' })
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'flex items-center gap-3 shrink-0' },
        React.createElement(Skeleton, { className: 'h-6 w-24 rounded-full' }),
        React.createElement(Skeleton, { className: 'h-8 w-20 rounded-lg' })
      )
    )
  );

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading student applications',
      className: `space-y-3 ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading your applications...'),
    ...cards
  );
}

/**
 * Skeleton loader for Dashboard Statistic Cards.
 *
 * @param {Object} props
 * @param {number} [props.count=4] - Number of stat cards to render
 * @param {string} [props.className=''] - Additional container classes
 */
export function StatCardSkeleton({ count = 4, className = '' }) {
  const cards = Array.from({ length: count }, (_, idx) =>
    React.createElement(
      'div',
      { key: idx, className: 'bg-white rounded-xl p-4 shadow-sm space-y-2' },
      React.createElement(Skeleton, { variant: 'rounded', className: 'w-9 h-9 rounded-lg mb-2' }),
      React.createElement(Skeleton, { className: 'h-7 w-20' }),
      React.createElement(Skeleton, { className: 'h-3.5 w-28' })
    )
  );

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading statistics',
      className: `grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading statistics...'),
    ...cards
  );
}

/**
 * Skeleton loader for Profile views (matches StudentProfile.jsx and AdminStudentDetail.jsx layout).
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Additional container classes
 */
export function ProfileSkeleton({ className = '' }) {
  // Hero Header
  const hero = React.createElement(
    'div',
    {
      className: 'bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6',
    },
    React.createElement(Skeleton, { variant: 'circular', className: 'w-24 h-24 shrink-0' }),
    React.createElement(
      'div',
      { className: 'flex-1 text-center md:text-left space-y-3 w-full' },
      React.createElement(
        'div',
        { className: 'flex flex-col md:flex-row md:items-center justify-between gap-3' },
        React.createElement(
          'div',
          { className: 'space-y-1.5' },
          React.createElement(Skeleton, { className: 'h-7 w-56 mx-auto md:mx-0' }),
          React.createElement(Skeleton, { className: 'h-4 w-72 mx-auto md:mx-0' })
        ),
        React.createElement(
          'div',
          { className: 'flex gap-2 justify-center md:justify-end' },
          React.createElement(Skeleton, { className: 'h-9 w-28 rounded-xl' }),
          React.createElement(Skeleton, { className: 'h-9 w-28 rounded-xl' })
        )
      ),
      React.createElement(
        'div',
        { className: 'flex flex-wrap gap-2 justify-center md:justify-start pt-2' },
        React.createElement(Skeleton, { className: 'h-6 w-24 rounded-full' }),
        React.createElement(Skeleton, { className: 'h-6 w-32 rounded-full' }),
        React.createElement(Skeleton, { className: 'h-6 w-28 rounded-full' })
      )
    )
  );

  // Left Column
  const leftCol = React.createElement(
    'div',
    { className: 'lg:col-span-2 space-y-6' },
    // About
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3' },
      React.createElement(Skeleton, { className: 'h-5 w-40' }),
      React.createElement(Skeleton, { className: 'h-4 w-full' }),
      React.createElement(Skeleton, { className: 'h-4 w-11/12' }),
      React.createElement(Skeleton, { className: 'h-4 w-3/4' })
    ),
    // Academics
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4' },
      React.createElement(Skeleton, { className: 'h-5 w-48' }),
      React.createElement(
        'div',
        { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
        ...Array.from({ length: 4 }, (_, idx) =>
          React.createElement(
            'div',
            { key: idx, className: 'p-3 bg-gray-50 rounded-xl space-y-1.5' },
            React.createElement(Skeleton, { className: 'h-3 w-20' }),
            React.createElement(Skeleton, { className: 'h-4 w-36' })
          )
        )
      )
    ),
    // Projects
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4' },
      React.createElement(
        'div',
        { className: 'flex justify-between items-center' },
        React.createElement(Skeleton, { className: 'h-5 w-44' }),
        React.createElement(Skeleton, { className: 'h-8 w-24 rounded-lg' })
      ),
      React.createElement(
        'div',
        { className: 'space-y-3' },
        React.createElement(
          'div',
          { className: 'p-4 border border-gray-100 rounded-xl space-y-2' },
          React.createElement(Skeleton, { className: 'h-4 w-48' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-full' }),
          React.createElement(
            'div',
            { className: 'flex gap-2 pt-1' },
            React.createElement(Skeleton, { className: 'h-5 w-16 rounded' }),
            React.createElement(Skeleton, { className: 'h-5 w-20 rounded' })
          )
        )
      )
    )
  );

  // Right Column
  const rightCol = React.createElement(
    'div',
    { className: 'space-y-6' },
    // Resume
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4' },
      React.createElement(Skeleton, { className: 'h-5 w-36' }),
      React.createElement(
        'div',
        { className: 'p-4 border border-gray-100 rounded-xl space-y-3 text-center' },
        React.createElement(Skeleton, { variant: 'rounded', className: 'w-12 h-12 mx-auto rounded-lg' }),
        React.createElement(Skeleton, { className: 'h-4 w-40 mx-auto' }),
        React.createElement(Skeleton, { className: 'h-8 w-full rounded-lg' })
      )
    ),
    // Skills
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3' },
      React.createElement(Skeleton, { className: 'h-5 w-28' }),
      React.createElement(
        'div',
        { className: 'flex flex-wrap gap-2' },
        React.createElement(Skeleton, { className: 'h-6 w-20 rounded-full' }),
        React.createElement(Skeleton, { className: 'h-6 w-24 rounded-full' }),
        React.createElement(Skeleton, { className: 'h-6 w-16 rounded-full' }),
        React.createElement(Skeleton, { className: 'h-6 w-28 rounded-full' })
      )
    )
  );

  const mainGrid = React.createElement(
    'div',
    { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
    leftCol,
    rightCol
  );

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading profile',
      className: `flex-1 px-4 md:px-8 py-6 space-y-6 overflow-x-hidden ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading profile details from server...'),
    hero,
    React.createElement(StatCardSkeleton, { count: 4 }),
    mainGrid
  );
}

/**
 * Skeleton loader for Job Details (matches JobDetailPage.jsx layout).
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Additional container classes
 */
export function JobDetailSkeleton({ className = '' }) {
  const heroCard = React.createElement(
    'div',
    {
      className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6',
    },
    React.createElement(
      'div',
      { className: 'flex items-start gap-4' },
      React.createElement(Skeleton, { variant: 'rounded', className: 'w-16 h-16 rounded-2xl shrink-0' }),
      React.createElement(
        'div',
        { className: 'space-y-2' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement(Skeleton, { className: 'h-6 w-48' }),
          React.createElement(Skeleton, { className: 'h-6 w-20 rounded-full' })
        ),
        React.createElement(Skeleton, { className: 'h-4 w-60' }),
        React.createElement(
          'div',
          { className: 'flex flex-wrap gap-3 pt-1' },
          React.createElement(Skeleton, { className: 'h-3.5 w-24' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-28' }),
          React.createElement(Skeleton, { className: 'h-3.5 w-20' })
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'flex gap-3 shrink-0' },
      React.createElement(Skeleton, { className: 'h-10 w-32 rounded-xl' }),
      React.createElement(Skeleton, { className: 'h-10 w-10 rounded-xl' })
    )
  );

  const gridContent = React.createElement(
    'div',
    { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
    React.createElement(
      'div',
      { className: 'lg:col-span-2 space-y-6' },
      React.createElement(
        'div',
        { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3' },
        React.createElement(Skeleton, { className: 'h-5 w-44' }),
        React.createElement(Skeleton, { className: 'h-4 w-full' }),
        React.createElement(Skeleton, { className: 'h-4 w-11/12' }),
        React.createElement(Skeleton, { className: 'h-4 w-3/4' })
      ),
      React.createElement(
        'div',
        { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3' },
        React.createElement(Skeleton, { className: 'h-5 w-40' }),
        React.createElement(Skeleton, { className: 'h-4 w-full' }),
        React.createElement(Skeleton, { className: 'h-4 w-5/6' })
      )
    ),
    React.createElement(
      'div',
      { className: 'space-y-6' },
      React.createElement(
        'div',
        { className: 'bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4' },
        React.createElement(Skeleton, { className: 'h-5 w-32' }),
        ...Array.from({ length: 4 }, (_, i) =>
          React.createElement(
            'div',
            { key: i, className: 'flex justify-between items-center py-1' },
            React.createElement(Skeleton, { className: 'h-3.5 w-20' }),
            React.createElement(Skeleton, { className: 'h-3.5 w-24' })
          )
        )
      )
    )
  );

  return React.createElement(
    'main',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading job drive details',
      className: `flex-1 px-4 md:px-8 py-6 max-w-6xl mx-auto w-full space-y-6 ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading job drive details...'),
    React.createElement(Skeleton, { className: 'h-4 w-32' }),
    heroCard,
    gridContent
  );
}

/**
 * Skeleton loader for generic List rows (e.g. Notifications, Logs).
 *
 * @param {Object} props
 * @param {number} [props.count=3] - Number of list rows
 * @param {string} [props.className=''] - Additional container classes
 */
export function ListRowSkeleton({ count = 3, className = '' }) {
  const rows = Array.from({ length: count }, (_, idx) =>
    React.createElement(
      'div',
      {
        key: idx,
        className: 'bg-white rounded-xl p-4 shadow-sm flex gap-4 items-start',
      },
      React.createElement(Skeleton, { variant: 'circular', className: 'shrink-0 w-10 h-10' }),
      React.createElement(
        'div',
        { className: 'flex-1 space-y-2' },
        React.createElement(Skeleton, { className: 'h-4 w-1/3' }),
        React.createElement(Skeleton, { className: 'h-3 w-3/4' }),
        React.createElement(Skeleton, { className: 'h-2.5 w-1/6' })
      )
    )
  );

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading list items',
      className: `space-y-3 ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading list items...'),
    ...rows
  );
}

/**
 * Skeleton loader for Tables.
 *
 * @param {Object} props
 * @param {number} [props.rows=5] - Number of table rows
 * @param {number} [props.cols=4] - Number of table columns
 * @param {string} [props.className=''] - Additional container classes
 */
export function TableSkeleton({ rows = 5, cols = 4, className = '' }) {
  const headers = Array.from({ length: cols }, (_, c) =>
    React.createElement(
      'th',
      { key: c, className: 'p-4' },
      React.createElement(Skeleton, { className: 'h-4 w-24' })
    )
  );

  const tableRows = Array.from({ length: rows }, (_, r) =>
    React.createElement(
      'tr',
      { key: r },
      ...Array.from({ length: cols }, (_, c) =>
        React.createElement(
          'td',
          { key: c, className: 'p-4' },
          React.createElement(Skeleton, { className: `h-4 ${c === 0 ? 'w-36' : 'w-20'}` })
        )
      )
    )
  );

  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      'aria-label': 'Loading table data',
      className: `bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`.trim(),
    },
    React.createElement('span', { className: 'sr-only' }, 'Loading table data...'),
    React.createElement(
      'div',
      { className: 'overflow-x-auto' },
      React.createElement(
        'table',
        { className: 'w-full text-left border-collapse' },
        React.createElement(
          'thead',
          null,
          React.createElement('tr', { className: 'bg-gray-50 border-b border-gray-200' }, ...headers)
        ),
        React.createElement('tbody', { className: 'divide-y divide-gray-100' }, ...tableRows)
      )
    )
  );
}

// Compound component pattern attachments
Skeleton.JobCard = JobCardSkeleton;
Skeleton.JobDetail = JobDetailSkeleton;
Skeleton.ApplicationCard = ApplicationCardSkeleton;
Skeleton.StatCard = StatCardSkeleton;
Skeleton.Profile = ProfileSkeleton;
Skeleton.ListRow = ListRowSkeleton;
Skeleton.Table = TableSkeleton;

export default Skeleton;
