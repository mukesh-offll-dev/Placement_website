/**
 * Standalone entry point for the auth hook.
 *
 * useAuth lives in AuthContext.jsx next to the provider; this module simply
 * re-exports it so `import { useAuth } from '../context/useAuth'` also works.
 * Defining it here instead would make the two modules import each other.
 */
export { useAuth, useAuth as default } from './AuthContext.jsx';
