import { X, Clock, MapPin, User, Users, BookOpen, Calendar, Mail, StickyNote } from 'lucide-react';
import type { Course } from '../../types/schedule';
import { SUBJECT_COLORS } from '../../constants/colors';
import { formatTimeRange } from '../../constants/timeSlots';
import { DAYS_OF_WEEK } from '../../constants/timeSlots';

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
}

export default function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  const colors = SUBJECT_COLORS[course.subject];

  // Format days for display
  const formatDays = (days: Course['meetings'][0]['days']) => {
    return days
      .map((day) => DAYS_OF_WEEK.find((d) => d.key === day)?.short || day)
      .join(', ');
  };

  // Calculate enrollment status
  const enrollmentStatus = () => {
    const percent = course.enrollment.utilizationPercent;

    if (percent >= 100) return { label: 'Full', color: 'text-red-600 bg-red-50' };
    if (percent >= 80) return { label: 'Almost Full', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Available', color: 'text-green-600 bg-green-50' };
  };

  const status = enrollmentStatus();

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content animate-slide-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          className="modal-header"
          style={{ backgroundColor: colors.light, borderBottom: `3px solid ${colors.bg}` }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: colors.bg }}
              >
                {course.subject}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              {course.displayCode} - Section {course.section}
            </h2>
            <p className="text-gray-600">{course.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-6">
          {/* Quick info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{course.crn}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">CRN</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{course.credits}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Credits</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {course.enrollment.current}/{course.enrollment.maximum}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Enrolled</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{course.enrollment.available}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Left</div>
            </div>
          </div>

          {/* Instructor */}
          {course.instructor && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{course.instructor.displayName}</div>
                <a
                  href={`mailto:${course.instructor.email}`}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  {course.instructor.email}
                </a>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </h3>
            <div className="space-y-2">
              {course.meetings.map((meeting, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">
                        {formatTimeRange(meeting.startMinutes, meeting.endMinutes)}
                      </span>
                    </div>
                    <div className="text-gray-900 font-medium">
                      {formatDays(meeting.days)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{meeting.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Course info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Delivery Method
              </h4>
              <p className="text-gray-900">{course.deliveryDescription}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Campus
              </h4>
              <p className="text-gray-900">{course.campusRaw}</p>
            </div>
          </div>

          {/* Waitlist info */}
          {course.enrollment.waitlistMax > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Waitlist
              </h4>
              <p className="text-amber-700">
                {course.enrollment.waitlist} of {course.enrollment.waitlistMax} waitlist spots used
              </p>
            </div>
          )}

          {/* Attributes */}
          {course.attributes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Attributes</h4>
              <div className="flex flex-wrap gap-2">
                {course.attributes.map((attr, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    title={attr.description}
                  >
                    {attr.code}
                    {attr.isZTC && ' (Zero Cost)'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Term info */}
          <div className="text-sm text-gray-500 border-t border-gray-200 pt-4">
            <span className="font-medium">Term:</span> {course.termDescription}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

