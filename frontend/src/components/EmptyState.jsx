import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  SearchX,
  AlertCircle,
  RotateCw,
  ArrowRight,
  FileQuestion,
} from 'lucide-react';

/**
 * Reusable EmptyState component for lists, search results, missing entities, and error states.
 *
 * @param {Object} props
 * @param {'empty'|'search'|'error'|'not-found'|'custom'} [props.type='empty']
 * @param {React.ComponentType} [props.icon] - Lucide icon or custom SVG component
 * @param {string} props.title - Main heading
 * @param {string} [props.description] - Supporting explanatory text
 * @param {Object} [props.action] - Primary action { label, onClick, to, icon }
 * @param {Object} [props.secondaryAction] - Secondary action { label, onClick, to, icon }
 * @param {boolean} [props.compact=false] - Compact variant for sidebars and small cards
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {React.ReactNode} [props.children] - Optional custom children
 */
export default function EmptyState({
  type = 'empty',
  icon: CustomIcon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
  children,
}) {
  // Default configurations based on type
  const defaultConfig = {
    empty: {
      icon: FolderOpen,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      defaultTitle: 'No data available',
      role: 'status',
    },
    search: {
      icon: SearchX,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      defaultTitle: 'No results found',
      role: 'status',
    },
    error: {
      icon: AlertCircle,
      iconBg: 'bg-red-50 text-red-600 border-red-100',
      defaultTitle: 'Something went wrong',
      role: 'alert',
    },
    'not-found': {
      icon: FileQuestion,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      defaultTitle: 'Item not found',
      role: 'status',
    },
  };

  const config = defaultConfig[type] || defaultConfig.empty;
  const IconComponent = CustomIcon || config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div
      role={config.role}
      className={`text-center flex flex-col items-center justify-center transition-all ${
        compact
          ? 'py-6 px-4'
          : 'py-12 px-6 bg-white rounded-2xl border border-gray-100 shadow-xs'
      } ${className}`}
    >
      {/* Icon with glowing aura */}
      <div
        className={`relative flex items-center justify-center rounded-2xl border transition-transform duration-300 hover:scale-105 ${
          config.iconBg
        } ${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4 shadow-sm'}`}
      >
        <IconComponent className={compact ? 'w-6 h-6' : 'w-8 h-8'} aria-hidden="true" />
      </div>

      {/* Headings */}
      <h3
        className={`font-bold text-gray-900 tracking-tight ${
          compact ? 'text-sm' : 'text-base sm:text-lg'
        }`}
      >
        {displayTitle}
      </h3>

      {description && (
        <p
          className={`text-gray-500 max-w-md mx-auto leading-relaxed ${
            compact ? 'text-xs mt-1' : 'text-sm mt-1.5'
          }`}
        >
          {description}
        </p>
      )}

      {/* Optional custom children */}
      {children && <div className="mt-3 w-full">{children}</div>}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div
          className={`flex flex-wrap items-center justify-center gap-2.5 ${
            compact ? 'mt-3.5' : 'mt-5'
          }`}
        >
          {action &&
            (action.to ? (
              <Link
                to={action.to}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {action.icon && React.createElement(action.icon, { className: 'w-4 h-4' })}
                <span>{action.label}</span>
                {!action.icon && <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {action.icon && React.createElement(action.icon, { className: 'w-4 h-4' })}
                <span>{action.label}</span>
              </button>
            ))}

          {secondaryAction &&
            (secondaryAction.to ? (
              <Link
                to={secondaryAction.to}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
              >
                {secondaryAction.icon &&
                  React.createElement(secondaryAction.icon, { className: 'w-3.5 h-3.5' })}
                <span>{secondaryAction.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
              >
                {secondaryAction.icon &&
                  React.createElement(secondaryAction.icon, { className: 'w-3.5 h-3.5' })}
                <span>{secondaryAction.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
