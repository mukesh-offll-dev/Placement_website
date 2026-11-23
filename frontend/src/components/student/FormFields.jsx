import { useId } from 'react';
import { Lock } from 'lucide-react';

const inputCls = (error) =>
  `w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 ${
    error ? 'border-red-400 bg-red-50' : 'border-gray-300'
  }`;

function FieldShell({ id, label, required, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-red-500 text-xs mt-1">
          {error}
        </p>
      ) : hint ? (
        <p className="text-gray-400 text-[11px] mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

/** Text / number / date / url input with label and error. */
export function TextField({ label, value, onChange, error, required, hint, type = 'text', ...rest }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputCls(error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({ label, value, onChange, error, required, hint, rows = 3, maxLength, ...rest }) {
  const id = useId();
  const length = String(value ?? '').length;
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint || (maxLength ? `${length} / ${maxLength} characters` : undefined)}
    >
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputCls(error)} resize-y`}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({ label, value, onChange, error, required, hint, options, placeholder }) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={inputCls(error)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
      />
      <label htmlFor={id} className="text-xs text-gray-700 font-medium">
        {label}
      </label>
    </div>
  );
}

/** Read-only value managed by the placement cell. */
export function ReadOnlyField({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      <p className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl text-sm text-gray-600 flex items-center gap-1.5 min-h-[38px] break-all">
        <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
        {value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : 'Not provided'}
      </p>
    </div>
  );
}
