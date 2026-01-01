/**
 * =============================================================================
 * COMPONENT: EmojiPicker
 * =============================================================================
 *
 * PURPOSE: Simple emoji picker for student persona identification
 *
 * PRIVACY NOTE: We use emojis instead of names or photos to discourage
 * storing identifiable information on GitHub Pages deployments.
 * =============================================================================
 */

import type { PersonaEmoji } from '../../types/advising';

interface EmojiPickerProps {
  selectedEmoji: PersonaEmoji;
  onSelect: (emoji: PersonaEmoji) => void;
}

/**
 * Available emojis with descriptions for accessibility
 */
const EMOJI_OPTIONS: { emoji: PersonaEmoji; label: string }[] = [
  { emoji: '🎓', label: 'Graduation cap' },
  { emoji: '🔐', label: 'Lock (cybersecurity)' },
  { emoji: '💻', label: 'Laptop (CS student)' },
  { emoji: '🛡️', label: 'Shield (security)' },
  { emoji: '🚀', label: 'Rocket (ambitious)' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '📚', label: 'Books (studious)' },
  { emoji: '🔷', label: 'Blue diamond' },
  { emoji: '🟢', label: 'Green (on track)' },
  { emoji: '🟡', label: 'Yellow (caution)' },
  { emoji: '🔴', label: 'Red (attention needed)' },
  { emoji: '👤', label: 'Person' },
];

export const DEFAULT_EMOJI: PersonaEmoji = '🎓';

export default function EmojiPicker({ selectedEmoji, onSelect }: EmojiPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOJI_OPTIONS.map(({ emoji, label }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={`
            w-12 h-12 text-2xl rounded-xl flex items-center justify-center
            transition-all touch-target
            ${
              selectedEmoji === emoji
                ? 'bg-ewu-red/10 ring-2 ring-ewu-red scale-110'
                : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
            }
          `}
          title={label}
          aria-label={`Select ${label} emoji`}
          aria-pressed={selectedEmoji === emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
