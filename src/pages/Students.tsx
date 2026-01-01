/**
 * =============================================================================
 * PAGE: Students (Advising System)
 * =============================================================================
 *
 * PURPOSE: Main page for the student advising system
 *
 * EDUCATIONAL NOTES:
 * - This page combines persona management with degree progress tracking
 * - Follows the master-detail pattern: list on left, detail on right
 * - Mobile-first: shows list view, then detail on selection
 *
 * FEATURES:
 * - Create and manage hypothetical student personas
 * - View degree requirements and progress
 * - Track courses taken with grades
 * - Plan graduation pathways
 * =============================================================================
 */

import { useState } from 'react';
import { Users, GraduationCap, BookOpen, ChevronLeft, Info } from 'lucide-react';
import type { StudentPersona } from '../types/advising';
import PersonaList from '../components/advising/PersonaList';
import { getAvailablePrograms } from '../services/catalogParser';
import { formatTerm } from '../constants/academicTerms';
import RegistrationPrepCard from '../components/advising/RegistrationPrepCard';

/**
 * Students page - main advising dashboard
 */
export default function Students() {
  const [selectedPersona, setSelectedPersona] = useState<StudentPersona | null>(null);
  const programs = getAvailablePrograms();

  // Mobile: show detail view when persona is selected
  const showingDetail = selectedPersona !== null;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ewu-red/10 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-ewu-red" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Student Advising</h1>
            <p className="text-sm text-gray-500">Plan degree pathways with hypothetical personas</p>
          </div>
        </div>
      </div>

      {/* Privacy Banner */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Privacy Notice:</strong> This tool is for fictional planning personas only.
            Never enter real student information. Data is stored locally in your browser.
          </div>
        </div>
      </div>

      {/* Action Center: Registration prep */}
      <div className="px-4 py-4 sm:px-6">
        <RegistrationPrepCard />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Panel: Persona List (hidden on mobile when detail is shown) */}
        <div
          className={`
            lg:w-1/2 xl:w-2/5 lg:border-r lg:border-gray-200 lg:min-h-[calc(100vh-10rem)]
            ${showingDetail ? 'hidden lg:block' : 'block'}
          `}
        >
          <div className="p-4 sm:p-6">
            <PersonaList
              selectedPersonaId={selectedPersona?.id}
              onSelectPersona={setSelectedPersona}
            />
          </div>
        </div>

        {/* Right Panel: Persona Detail */}
        <div
          className={`
            lg:w-1/2 xl:w-3/5 lg:min-h-[calc(100vh-10rem)]
            ${showingDetail ? 'block' : 'hidden lg:block'}
          `}
        >
          {selectedPersona ? (
            <PersonaDetail
              persona={selectedPersona}
              programName={programs.find((p) => p.slug === selectedPersona.primaryMajor)?.name}
              onBack={() => setSelectedPersona(null)}
            />
          ) : (
            <EmptyDetailState />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state shown when no persona is selected
 */
function EmptyDetailState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Select a Persona</h3>
        <p className="text-gray-500">
          Choose a persona from the list to view their degree progress, course history,
          and graduation plan.
        </p>
      </div>
    </div>
  );
}

/**
 * Persona detail view
 */
interface PersonaDetailProps {
  persona: StudentPersona;
  programName?: string;
  onBack: () => void;
}

function PersonaDetail({ persona, programName, onBack }: PersonaDetailProps) {
  // Calculate stats
  const completedCredits = persona.completedCourses.reduce((sum, c) => sum + c.credits, 0);
  const passingCourses = persona.completedCourses.filter(
    (c) => c.grade && !['W', 'NP', 'F'].includes(c.grade)
  );

  // Calculate GPA
  const GRADE_POINTS: Record<string, number> = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0,
  };

  let totalPoints = 0;
  let totalGpaCredits = 0;
  passingCourses.forEach((course) => {
    if (course.grade && GRADE_POINTS[course.grade] !== undefined) {
      totalPoints += GRADE_POINTS[course.grade] * course.credits;
      totalGpaCredits += course.credits;
    }
  });
  const gpa = totalGpaCredits > 0 ? (totalPoints / totalGpaCredits).toFixed(2) : 'N/A';

  return (
    <div className="p-4 sm:p-6">
      {/* Mobile back button */}
      <button
        onClick={onBack}
        className="lg:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 touch-target"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back to list</span>
      </button>

      {/* Persona header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Emoji Avatar - displays the selected emoji for this persona */}
          <div className="w-16 h-16 bg-ewu-red/10 rounded-full flex items-center justify-center text-4xl">
            {persona.icon || '🎓'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{persona.nickname}</h2>
            <p className="text-gray-500">{programName || persona.primaryMajor}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Started {formatTerm(persona.startTerm)}</span>
              <span>•</span>
              <span>Expected {formatTerm(persona.expectedGraduation)}</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900">{completedCredits}</div>
            <div className="text-xs text-gray-500 mt-1">Credits</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900">{passingCourses.length}</div>
            <div className="text-xs text-gray-500 mt-1">Courses</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-gray-900">{gpa}</div>
            <div className="text-xs text-gray-500 mt-1">GPA</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-2xl font-bold text-ewu-red">
              {Math.round((completedCredits / 120) * 100)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Complete</div>
          </div>
        </div>
      </div>

      {/* Course History */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Course History</h3>
          </div>
        </div>

        {persona.completedCourses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No courses added yet.</p>
            <p className="text-sm mt-1">Add completed courses to track progress.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {persona.completedCourses.map((course, index) => (
              <div
                key={`${course.courseCode}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <div className="font-medium text-gray-900">{course.courseCode}</div>
                  <div className="text-sm text-gray-500">{formatTerm(course.term)}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{course.credits} cr</span>
                  {course.grade && (
                    <span
                      className={`
                        px-2 py-1 rounded text-sm font-medium
                        ${course.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                          course.grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                          course.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-700' :
                          course.grade === 'W' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }
                      `}
                    >
                      {course.grade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {persona.notes && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{persona.notes}</p>
        </div>
      )}
    </div>
  );
}
