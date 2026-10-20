import React from 'react';
import { Loader2 } from 'lucide-react';

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const COLOR_MAP = {
  primary: 'text-blue-600',
  white: 'text-white',
  gray: 'text-gray-400',
  muted: 'text-gray-500',
  current: 'text-current',
};

/**
 * Reusable LoadingSpinner component.
 * Supports button-level, inline, card-level, and full-page loading indicators.
 * Built with React.createElement to ensure seamless compatibility with Node test runners and Vite.
 *
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|string} [props.size='md'] - Spinner dimensions
 * @param {'primary'|'white'|'gray'|'muted'|'current'|string} [props.color='primary'] - Spinner color
 * @param {string} [props.label='Loading...'] - Accessible status text
 * @param {boolean} [props.showLabel=false] - Whether to visibly display the label
 * @param {boolean} [props.center=false] - Whether to center the spinner inside its parent container
 * @param {boolean} [props.fullPage=false] - Whether to render as a full-page loading viewport
 * @param {string} [props.className=''] - Additional class names for the spinner icon
 * @param {string} [props.containerClassName=''] - Additional class names for the container
 */
export default function LoadingSpinner({
  size = 'md',
  color = 'primary',
  label = 'Loading...',
  showLabel = false,
  center = false,
  fullPage = false,
  className = '',
  containerClassName = '',
  ...rest
}) {
  const sizeClass = SIZE_MAP[size] || size || SIZE_MAP.md;
  const colorClass = COLOR_MAP[color] || color || COLOR_MAP.primary;

  const spinnerIcon = React.createElement(Loader2, {
    className: `animate-spin motion-reduce:animate-none shrink-0 ${sizeClass} ${colorClass} ${className}`.trim(),
    'aria-hidden': 'true',
    ...rest,
  });

  const statusLabel = showLabel
    ? React.createElement('span', { className: 'text-sm font-medium text-gray-600 dark:text-gray-300' }, label)
    : React.createElement('span', { className: 'sr-only' }, label);

  // If fullPage mode is requested
  if (fullPage) {
    return React.createElement(
      'div',
      {
        role: 'status',
        'aria-live': 'polite',
        'aria-busy': 'true',
        className: `min-h-[60vh] flex flex-col items-center justify-center p-8 text-center ${containerClassName}`.trim(),
      },
      spinnerIcon,
      showLabel
        ? React.createElement('p', { className: 'mt-3 text-sm font-medium text-gray-600 dark:text-gray-300' }, label)
        : React.createElement('span', { className: 'sr-only' }, label)
    );
  }

  // If centered inside a container
  if (center) {
    return React.createElement(
      'div',
      {
        role: 'status',
        'aria-live': 'polite',
        'aria-busy': 'true',
        className: `flex items-center justify-center gap-2 p-6 text-center ${containerClassName}`.trim(),
      },
      spinnerIcon,
      statusLabel
    );
  }

  // Inline or inside button
  return React.createElement(
    'span',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-busy': 'true',
      className: `inline-flex items-center gap-2 ${containerClassName}`.trim(),
    },
    spinnerIcon,
    showLabel
      ? React.createElement('span', { className: 'text-sm font-medium' }, label)
      : React.createElement('span', { className: 'sr-only' }, label)
  );
}
