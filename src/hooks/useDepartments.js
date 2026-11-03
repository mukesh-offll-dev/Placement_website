import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDepartments } from '../services/api/departmentService';

/**
 * The college's departments, from the backend, so a department an admin adds shows up in every
 * dropdown without a code change.
 *
 * `departments` is every row (for the management screen); `active` is only the ones that can be
 * chosen for a new student. Call `reload` after adding, renaming or switching one.
 */
export default function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(reload, 0);
    return () => clearTimeout(first);
  }, [reload]);

  const active = useMemo(() => departments.filter((d) => d.isActive !== false), [departments]);

  return { departments, active, loading, error, reload };
}
