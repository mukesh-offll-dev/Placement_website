import React, { useState } from 'react';
import { Dialog, DialogOverlay, DialogContent } from '@headlessui/react';
import { X } from 'lucide-react';

/**
 * Interview Scheduling Modal
 * Props:
 *  - open: boolean – whether modal is visible
 *  - onClose: () => void – called when modal is dismissed
 *  - onConfirm: (data) => void – called with interview details when user confirms
 *  - application: object – contains student and job info (used to display summary)
 */
export default function InterviewSchedulingModal({ open, onClose, onConfirm, application }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [mode, setMode] = useState('Online'); // Online / Offline
  const [round, setRound] = useState('Technical');
  const [meetingLink, setMeetingLink] = useState('');
  const [venue, setVenue] = useState('');
  const [interviewer, setInterviewer] = useState('');
  const [instructions, setInstructions] = useState('');

  const isValid = () => {
    if (!date || !time || !mode || !round) return false;
    if (mode === 'Online' && !meetingLink) return false;
    if (mode === 'Offline' && !venue) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!isValid()) return;
    const payload = {
      date,
      time,
      mode,
      round,
      meetingLink: mode === 'Online' ? meetingLink : undefined,
      venue: mode === 'Offline' ? venue : undefined,
      interviewer: interviewer || undefined,
      instructions: instructions || undefined,
    };
    onConfirm(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <DialogOverlay className="fixed inset-0 bg-black bg-opacity-30" />
      <DialogContent className="relative bg-white max-w-md mx-auto mt-20 rounded-lg shadow-lg p-6">
        <button
          type="button"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4">Schedule Interview</h2>
        {application && (
          <div className="mb-4 text-sm text-gray-600">
            <p><strong>Student:</strong> {application.studentName || application.name}</p>
            <p><strong>Register No:</strong> {application.registerNumber || application.registerNumber}</p>
            <p><strong>Company:</strong> {application.companyName || application.company?.name}</p>
            <p><strong>Job Role:</strong> {application.jobRole || application.role}</p>
          </div>
        )}
        <div className="grid gap-3">
          <label className="block">
            <span className="text-gray-700">Interview Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Interview Time</span>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Mode</span>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option>Online</option>
              <option>Offline</option>
            </select>
          </label>
          {mode === 'Online' && (
            <label className="block">
              <span className="text-gray-700">Meeting Link</span>
              <input
                type="url"
                placeholder="https://..."
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                className="mt-1 block w-full border rounded p-2"
              />
            </label>
          )}
          {mode === 'Offline' && (
            <label className="block">
              <span className="text-gray-700">Venue</span>
              <input
                type="text"
                placeholder="Room, Building"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                className="mt-1 block w-full border rounded p-2"
              />
            </label>
          )}
          <label className="block">
            <span className="text-gray-700">Interview Round</span>
            <select
              value={round}
              onChange={e => setRound(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option>Technical</option>
              <option>HR</option>
              <option>Final</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-gray-700">Interviewer Name (optional)</span>
            <input
              type="text"
              value={interviewer}
              onChange={e => setInterviewer(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Additional Instructions (optional)</span>
            <textarea
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid()}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50`}
          >
            Confirm Interview
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
