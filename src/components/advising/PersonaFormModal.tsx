/**
 * =============================================================================
 * COMPONENT: PersonaFormModal
 * =============================================================================
 *
 * PURPOSE: Modal form for creating and editing student personas
 *
 * PRIVACY NOTE: Names are auto-generated as "Student 1", "Student 2", etc.
 * to discourage storing identifiable information on GitHub Pages.
 * Only emoji selection is allowed for visual identification.
 *
 * EDUCATIONAL NOTES:
 * - Uses controlled form inputs for React state management
 * - Implements form validation before submission
 * - Shows privacy reminder for first-time users
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import type { StudentPersona, PersonaEmoji } from '../../types/advising';
import { getAvailablePrograms } from '../../services/catalogParser';
import { getCurrentTerm, addQuarters, formatTerm } from '../../constants/academicTerms';
import EmojiPicker, { DEFAULT_EMOJI } from './EmojiPicker';
import { hasShownPrivacyReminder, markPrivacyReminderShown } from '../../contexts/StudentContext';

interface PersonaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<StudentPersona, 'id' | 'createdAt' | 'updatedAt'>) => void;
  existingPersona?: StudentPersona;
  /** Next available student number for auto-naming */
  nextStudentNumber: number;
}

export default function PersonaFormModal({
  isOpen,
  onClose,
  onSave,
  existingPersona,
  nextStudentNumber,
}: PersonaFormModalProps) {
  const isEditing = !!existingPersona;
  const programs = getAvailablePrograms();

  // Form state - NO nickname field, just emoji
  const [emoji, setEmoji] = useState<PersonaEmoji>(DEFAULT_EMOJI);
  const [primaryMajor, setPrimaryMajor] = useState('computer-science-cyber-operations-bs');
  const [startTerm, setStartTerm] = useState(getCurrentTerm());
  const [yearsToGraduate, setYearsToGraduate] = useState(4);
  const [preferredCampus, setPreferredCampus] = useState<'Cheney' | 'Spokane U-District' | undefined>();
  const [maxCredits, setMaxCredits] = useState(15);
  const [notes, setNotes] = useState('');

  // Privacy reminder state
  const [showPrivacyReminder, setShowPrivacyReminder] = useState(false);

  // Reset form when modal opens/closes or persona changes
  useEffect(() => {
    if (isOpen) {
      if (existingPersona) {
        setEmoji(existingPersona.icon as PersonaEmoji);
        setPrimaryMajor(existingPersona.primaryMajor);
        setStartTerm(existingPersona.startTerm);
        setPreferredCampus(existingPersona.preferredCampus);
        setMaxCredits(existingPersona.maxCreditsPerQuarter || 15);
        setNotes(existingPersona.notes || '');
      } else {
        // New persona - reset to defaults
        setEmoji(DEFAULT_EMOJI);
        setPrimaryMajor('computer-science-cyber-operations-bs');
        setStartTerm(getCurrentTerm());
        setYearsToGraduate(4);
        setPreferredCampus(undefined);
        setMaxCredits(15);
        setNotes('');

        // Show privacy reminder for first-time users
        if (!hasShownPrivacyReminder()) {
          setShowPrivacyReminder(true);
        }
      }
    }
  }, [isOpen, existingPersona]);

  // Calculate expected graduation based on start term and years
  const expectedGraduation = addQuarters(startTerm, yearsToGraduate * 4 - 1);

  // Auto-generated name (Student 1, Student 2, etc.)
  const autoName = isEditing
    ? existingPersona.nickname
    : `Student ${nextStudentNumber}`;

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      nickname: autoName,
      icon: emoji,
      primaryMajor,
      minors: [],
      startTerm,
      expectedGraduation,
      completedCourses: existingPersona?.completedCourses || [],
      currentCourses: existingPersona?.currentCourses || [],
      preferredCampus,
      maxCreditsPerQuarter: maxCredits,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  // Handle privacy reminder acknowledgment
  const acknowledgePrivacy = () => {
    markPrivacyReminderShown();
    setShowPrivacyReminder(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? `Edit ${existingPersona.nickname}` : 'Add New Student Profile'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Privacy Reminder */}
        {showPrivacyReminder && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Privacy Notice</h3>
                <p className="text-sm text-amber-700 mt-1">
                  These profiles are for <strong>hypothetical planning scenarios</strong>.
                  Profiles are auto-named "Student 1, 2, 3..." to prevent storing real names.
                  Data is stored locally in your browser.
                </p>
                <button
                  onClick={acknowledgePrivacy}
                  className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 touch-target"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Auto-generated name display */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{emoji}</span>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{autoName}</div>
                  <div className="text-sm text-gray-500">
                    {isEditing ? 'Editing existing profile' : 'New student profile'}
                  </div>
                </div>
              </div>
            </div>

            {/* Emoji Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose an Emoji
              </label>
              <EmojiPicker selectedEmoji={emoji} onSelect={setEmoji} />
              <p className="mt-2 text-xs text-gray-500">
                Select an emoji to identify this profile
              </p>
            </div>

            {/* Primary Major */}
            <div>
              <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Major
              </label>
              <select
                id="major"
                value={primaryMajor}
                onChange={(e) => setPrimaryMajor(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ewu-red focus:border-ewu-red"
              >
                {programs.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Term and Years */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTerm" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Term
                </label>
                <input
                  id="startTerm"
                  type="text"
                  value={startTerm}
                  onChange={(e) => setStartTerm(e.target.value)}
                  placeholder="202510"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ewu-red focus:border-ewu-red"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formatTerm(startTerm)}
                </p>
              </div>

              <div>
                <label htmlFor="years" className="block text-sm font-medium text-gray-700 mb-1">
                  Years to Graduate
                </label>
                <select
                  id="years"
                  value={yearsToGraduate}
                  onChange={(e) => setYearsToGraduate(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ewu-red focus:border-ewu-red"
                >
                  <option value={2}>2 years (Transfer)</option>
                  <option value={3}>3 years</option>
                  <option value={4}>4 years</option>
                  <option value={5}>5 years</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Graduate: {formatTerm(expectedGraduation)}
                </p>
              </div>
            </div>

            {/* Preferred Campus */}
            <div>
              <label htmlFor="campus" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Campus
              </label>
              <select
                id="campus"
                value={preferredCampus || ''}
                onChange={(e) =>
                  setPreferredCampus(
                    e.target.value ? (e.target.value as 'Cheney' | 'Spokane U-District') : undefined
                  )
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ewu-red focus:border-ewu-red"
              >
                <option value="">No preference</option>
                <option value="Cheney">Cheney Campus</option>
                <option value="Spokane U-District">Spokane U-District</option>
              </select>
            </div>

            {/* Max Credits */}
            <div>
              <label htmlFor="maxCredits" className="block text-sm font-medium text-gray-700 mb-1">
                Max Credits per Quarter
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="maxCredits"
                  type="range"
                  min={12}
                  max={21}
                  value={maxCredits}
                  onChange={(e) => setMaxCredits(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium text-gray-900">{maxCredits}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                12 = part-time, 15 = standard, 18+ = overload
              </p>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Planning Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Transfer student, needs evening classes, working part-time..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ewu-red focus:border-ewu-red resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4 bg-gray-50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-4 h-4" />
              <span>Data stored locally only</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium touch-target"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-ewu-red text-white rounded-xl font-medium hover:bg-ewu-red-dark touch-target"
              >
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
