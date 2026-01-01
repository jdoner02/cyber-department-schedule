/**
 * =============================================================================
 * COMPONENT: PersonaCard
 * =============================================================================
 *
 * PURPOSE: Display a single student persona in a card format
 *
 * PRIVACY NOTE: Personas use auto-generated names (Student 1, 2, 3...)
 * and emojis for identification to prevent storing real student info.
 *
 * EDUCATIONAL NOTES:
 * - Uses Tailwind CSS for responsive, utility-first styling
 * - Implements touch-friendly design (44px minimum touch targets)
 * - Shows key persona info at a glance
 * =============================================================================
 */

import { GraduationCap, Calendar, MoreVertical } from 'lucide-react';
import type { StudentPersona } from '../../types/advising';
import { formatTerm, getQuartersBetween, getCurrentTerm } from '../../constants/academicTerms';
import { getAvailablePrograms } from '../../services/catalogParser';

interface PersonaCardProps {
  persona: StudentPersona;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PersonaCard({
  persona,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
}: PersonaCardProps) {
  // Find program name
  const programs = getAvailablePrograms();
  const program = programs.find((p) => p.slug === persona.primaryMajor);
  const programName = program?.name || persona.primaryMajor;

  // Calculate progress
  const completedCredits = persona.completedCourses.reduce((sum, c) => sum + c.credits, 0);
  const quartersRemaining = getQuartersBetween(getCurrentTerm(), persona.expectedGraduation);

  // Determine if on track (simple heuristic)
  const expectedProgress = ((12 - Math.max(0, quartersRemaining)) / 12) * 120;
  const isOnTrack = completedCredits >= expectedProgress * 0.8;

  return (
    <div
      className={`
        relative bg-white rounded-xl border-2 transition-all cursor-pointer
        hover:shadow-md
        ${isSelected
          ? 'border-ewu-red shadow-md'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}
      onClick={onSelect}
    >
      {/* Card content */}
      <div className="p-4">
        {/* Header row: Emoji + Name + Menu */}
        <div className="flex items-start gap-3">
          {/* Emoji Avatar */}
          <div
            className={`
              flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl
              ${isSelected ? 'bg-ewu-red/10' : 'bg-gray-100'}
            `}
          >
            {persona.icon || '🎓'}
          </div>

          {/* Name and program */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{persona.nickname}</h3>
            <p className="text-sm text-gray-500 truncate">{programName}</p>
          </div>

          {/* Actions menu */}
          {(onEdit || onDelete) && (
            <div className="flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit();
                }}
                className="p-2 rounded-lg hover:bg-gray-100 touch-target"
                aria-label="Edit profile"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {/* Credits completed */}
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{completedCredits}</div>
            <div className="text-xs text-gray-500">Credits</div>
          </div>

          {/* Courses taken */}
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {persona.completedCourses.length}
            </div>
            <div className="text-xs text-gray-500">Courses</div>
          </div>

          {/* Quarters remaining */}
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {Math.max(0, quartersRemaining)}
            </div>
            <div className="text-xs text-gray-500">Quarters</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Progress to graduation</span>
            <span
              className={`font-medium ${isOnTrack ? 'text-green-600' : 'text-yellow-600'}`}
            >
              {Math.round((completedCredits / 120) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOnTrack ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min((completedCredits / 120) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Started {formatTerm(persona.startTerm)}</span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Expected {formatTerm(persona.expectedGraduation)}</span>
          </div>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-ewu-red rounded-full" />
        </div>
      )}
    </div>
  );
}
