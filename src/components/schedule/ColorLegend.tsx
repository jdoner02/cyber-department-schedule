import { useColorBy } from '../../contexts/FilterContext';
import { useSchedule } from '../../contexts/ScheduleContext';
import { SUBJECT_COLORS, DELIVERY_COLORS, getInstructorColor } from '../../constants/colors';

export default function ColorLegend() {
  const { colorBy } = useColorBy();
  const { state } = useSchedule();

  if (colorBy === 'subject') {
    return (
      <div className="flex flex-wrap gap-4 text-sm">
        {state.subjects.map((subject) => (
          <div key={subject} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: SUBJECT_COLORS[subject].bg }}
            />
            <span className="text-gray-600">{subject}</span>
          </div>
        ))}
      </div>
    );
  }

  if (colorBy === 'delivery') {
    const methods = ['F2F', 'Online', 'Hybrid', 'Arranged'] as const;
    const labels: Record<string, string> = {
      F2F: 'Face-to-Face',
      Online: 'Online',
      Hybrid: 'Hybrid',
      Arranged: 'Arranged',
    };

    return (
      <div className="flex flex-wrap gap-4 text-sm">
        {methods.map((method) => (
          <div key={method} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: DELIVERY_COLORS[method].bg }}
            />
            <span className="text-gray-600">{labels[method]}</span>
          </div>
        ))}
      </div>
    );
  }

  if (colorBy === 'instructor') {
    // Show first 6 instructors
    const displayInstructors = state.instructors.slice(0, 6);

    return (
      <div className="flex flex-wrap gap-4 text-sm">
        {displayInstructors.map((instructor, index) => (
          <div key={instructor.email} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getInstructorColor(index) }}
            />
            <span className="text-gray-600">{instructor.lastName}</span>
          </div>
        ))}
        {state.instructors.length > 6 && (
          <span className="text-gray-400">+{state.instructors.length - 6} more</span>
        )}
      </div>
    );
  }

  return null;
}
