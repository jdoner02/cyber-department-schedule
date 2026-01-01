import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrilldownModalProps {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  overlayClassName?: string;
}

export default function DrilldownModal({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName,
  overlayClassName,
}: DrilldownModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay animate-fade-in ${overlayClassName ?? ''}`.trim()}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-content animate-slide-in ${maxWidthClassName ?? ''}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="pr-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description ? <div className="mt-1 text-sm text-gray-600">{description}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-footer">
          {footer ?? (
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

