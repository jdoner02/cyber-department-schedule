import { useState } from 'react';
import { Filter, X, ChevronDown, Palette } from 'lucide-react';
import { useFilters } from '../../contexts/FilterContext';
import { useSchedule } from '../../contexts/ScheduleContext';
import { DAYS_OF_WEEK } from '../../constants/timeSlots';
import { SUBJECT_COLORS, DELIVERY_COLORS } from '../../constants/colors';
import type { DeliveryMethod, ColorByOption } from '../../types/schedule';

export default function ScheduleFilters() {
  const { state, dispatch, activeFilterCount } = useFilters();
  const { state: scheduleState } = useSchedule();
  const [isExpanded, setIsExpanded] = useState(false);

  const { filters, colorBy } = state;

  const deliveryMethods: { key: DeliveryMethod; label: string }[] = [
    { key: 'F2F', label: 'Face-to-Face' },
    { key: 'Online', label: 'Online' },
    { key: 'Hybrid', label: 'Hybrid' },
    { key: 'Arranged', label: 'Arranged' },
  ];

  const colorByOptions: { key: ColorByOption; label: string }[] = [
    { key: 'subject', label: 'Subject' },
    { key: 'instructor', label: 'Instructor' },
    { key: 'delivery', label: 'Delivery' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      {/* Filter header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-ewu-red text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex items-center gap-4">
          {/* Color by selector */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            <select
              value={colorBy}
              onChange={(e) =>
                dispatch({ type: 'SET_COLOR_BY', payload: e.target.value as ColorByOption })
              }
              className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer"
            >
              {colorByOptions.map(({ key, label }) => (
                <option key={key} value={key}>
                  Color by {label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => dispatch({ type: 'RESET_FILTERS' })}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter content */}
      {isExpanded && (
        <div className="p-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subjects */}
          <div>
            <label className="label">Subjects</label>
            <div className="flex flex-wrap gap-2">
              {scheduleState.subjects.map((subject) => {
                const isActive = filters.subjects.includes(subject);
                const colors = SUBJECT_COLORS[subject];
                return (
                  <button
                    key={subject}
                    onClick={() => dispatch({ type: 'TOGGLE_SUBJECT', payload: subject })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: colors.bg } : undefined}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="label">Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(({ key, short }) => {
                const isActive = filters.days.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => dispatch({ type: 'TOGGLE_DAY', payload: key })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ewu-red text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery Method */}
          <div>
            <label className="label">Delivery</label>
            <div className="flex flex-wrap gap-2">
              {deliveryMethods.map(({ key, label }) => {
                const isActive = filters.delivery.includes(key);
                const colors = DELIVERY_COLORS[key];
                return (
                  <button
                    key={key}
                    onClick={() => dispatch({ type: 'TOGGLE_DELIVERY', payload: key })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: colors.bg } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructor */}
          <div>
            <label className="label">Instructor</label>
            <select
              value={filters.instructors[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                dispatch({
                  type: 'SET_INSTRUCTORS',
                  payload: value ? [value] : [],
                });
              }}
              className="select"
            >
              <option value="">All Instructors</option>
              {scheduleState.instructors.map((instructor) => (
                <option key={instructor.email} value={instructor.email}>
                  {instructor.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Active filters display */}
      {!isExpanded && activeFilterCount > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100">
          {filters.subjects.map((subject) => (
            <span
              key={subject}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: SUBJECT_COLORS[subject].bg }}
            >
              {subject}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SUBJECT', payload: subject })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.days.map((day) => (
            <span
              key={day}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-700"
            >
              {DAYS_OF_WEEK.find((d) => d.key === day)?.short}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_DAY', payload: day })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.delivery.map((method) => (
            <span
              key={method}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: DELIVERY_COLORS[method].bg }}
            >
              {method}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_DELIVERY', payload: method })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.instructors.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-700">
              {scheduleState.instructors.find((i) => i.email === filters.instructors[0])
                ?.lastName || 'Instructor'}
              <button
                onClick={() => dispatch({ type: 'SET_INSTRUCTORS', payload: [] })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
