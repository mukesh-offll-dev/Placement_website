/** Shared input styling for the student/faculty management forms. */
export const inputClass = (hasError) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-gray-50 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`;
