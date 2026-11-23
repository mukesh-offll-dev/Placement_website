import { useId, useState } from 'react';
import { X } from 'lucide-react';
import FormModal from './FormModal';
import { TextField, TextAreaField, SelectField, CheckboxField } from './FormFields';
import VerificationFileField from './VerificationFileField';
import { ITEM_FORMS, formFromItem, fileNameFromUrl } from './itemForms';

function TagsField({ label, value, onChange, error, hint }) {
  const id = useId();
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const add = (raw) => {
    const t = raw.trim().replace(/,$/, '');
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 px-3 py-2 border border-gray-300 rounded-xl min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-red-500" aria-label={`Remove ${t}`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(input);
            }
          }}
          onBlur={() => input.trim() && add(input)}
          placeholder={tags.length ? 'Add more…' : 'e.g. React'}
          className="flex-1 min-w-[100px] text-sm focus:outline-none bg-transparent"
        />
      </div>
      {error ? <p className="text-red-500 text-xs mt-1">{error}</p> : hint ? <p className="text-gray-400 text-[11px] mt-1">{hint}</p> : null}
    </div>
  );
}

/**
 * Add / edit one item of a list section (education, experience, projects, certifications,
 * achievements, supporting documents). Mount it with a `key` so each opening starts fresh.
 * `onSave(item)` receives the cleaned item (without id; the caller keeps the original id).
 */
export default function ItemEditorModal({ sectionKey, item, onSave, onClose }) {
  const def = ITEM_FORMS[sectionKey];
  const [form, setForm] = useState(() => {
    const f = formFromItem(sectionKey, item);
    def.fields.forEach((field) => {
      if (field.type === 'file' && field.nameField) f[field.nameField] = fileNameFromUrl(item?.[field.name]);
    });
    return f;
  });
  const [errors, setErrors] = useState({});

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = () => {
    const errs = def.validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave(def.toItem(form));
  };

  const renderField = (field) => {
    const common = {
      label: field.label,
      value: form[field.name],
      onChange: (v) => set(field.name, v),
      error: errors[field.name],
      required: field.required,
      hint: field.hint,
      placeholder: field.placeholder,
    };
    switch (field.type) {
      case 'textarea':
        return <TextAreaField {...common} maxLength={field.maxLength} />;
      case 'select':
        return <SelectField {...common} options={field.options} />;
      case 'checkbox':
        return (
          <CheckboxField
            label={field.label}
            checked={form[field.name]}
            onChange={(v) => setForm((f) => ({ ...f, [field.name]: v, ...(v && field.clears ? { [field.clears]: '' } : {}) }))}
          />
        );
      case 'tags':
        return <TagsField {...common} />;
      case 'file':
        return (
          <VerificationFileField
            label={field.label}
            section={field.section}
            required={field.required}
            fileUrl={form[field.name]}
            fileName={form[field.nameField]}
            fileSize={field.sizeField ? form[field.sizeField] : null}
            error={errors[field.name]}
            onUploaded={(r) =>
              setForm((f) => ({
                ...f,
                [field.name]: r.fileUrl,
                [field.nameField]: r.fileName,
                ...(field.sizeField ? { [field.sizeField]: r.size } : {}),
              }))
            }
            onRemove={() => setForm((f) => ({ ...f, [field.name]: null, [field.nameField]: null }))}
          />
        );
      default:
        return (
          <TextField
            {...common}
            type={field.type || 'text'}
            min={field.min}
            max={field.max}
            disabled={field.disabledWhen ? field.disabledWhen(form) : false}
          />
        );
    }
  };

  // Lay consecutive half-width fields out in pairs.
  const rows = [];
  def.fields.forEach((field) => {
    const last = rows[rows.length - 1];
    if (field.half && last && last.length === 1 && last[0].half) last.push(field);
    else rows.push([field]);
  });

  return (
    <FormModal
      open
      title={item ? `Edit ${def.noun.toLowerCase()}` : `Add ${def.noun.toLowerCase()}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={item ? 'Update in draft' : 'Add to draft'}
    >
      {rows.map((row) =>
        row.length === 2 ? (
          <div key={row[0].name} className="grid sm:grid-cols-2 gap-4">
            {row.map((f) => (
              <div key={f.name}>{renderField(f)}</div>
            ))}
          </div>
        ) : (
          <div key={row[0].name}>{renderField(row[0])}</div>
        )
      )}
    </FormModal>
  );
}
