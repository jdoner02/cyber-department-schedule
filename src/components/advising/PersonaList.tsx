/**
 * =============================================================================
 * COMPONENT: PersonaList
 * =============================================================================
 *
 * PURPOSE: Display and manage list of student personas
 *
 * EDUCATIONAL NOTES:
 * - Uses the "container component" pattern
 * - Handles selection state and CRUD operations
 * - Renders PersonaCards in a responsive grid
 * =============================================================================
 */

import { useState } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import type { StudentPersona } from '../../types/advising';
import { usePersonas, usePersonaActions } from '../../contexts/StudentContext';
import PersonaCard from './PersonaCard';
import PersonaFormModal from './PersonaFormModal';

interface PersonaListProps {
  selectedPersonaId?: string | null;
  onSelectPersona?: (persona: StudentPersona) => void;
}

export default function PersonaList({ selectedPersonaId, onSelectPersona }: PersonaListProps) {
  const personas = usePersonas();
  const { addPersona, updatePersona, deletePersona } = usePersonaActions();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<StudentPersona | undefined>();

  // Confirmation dialog state
  const [deletingPersonaId, setDeletingPersonaId] = useState<string | null>(null);

  // Calculate next student number for auto-naming
  // Extract numbers from existing "Student N" names and find the max
  const nextStudentNumber = (() => {
    const existingNumbers = personas
      .map((p) => {
        const match = p.nickname.match(/^Student (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    return existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  })();

  // Handle creating/editing personas
  const handleOpenCreate = () => {
    setEditingPersona(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (persona: StudentPersona) => {
    setEditingPersona(persona);
    setIsModalOpen(true);
  };

  const handleSave = (data: Omit<StudentPersona, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPersona) {
      updatePersona({
        ...editingPersona,
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newPersona = addPersona(data);
      if (onSelectPersona) {
        onSelectPersona(newPersona);
      }
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: string) => {
    setDeletingPersonaId(id);
  };

  const handleConfirmDelete = () => {
    if (deletingPersonaId) {
      deletePersona(deletingPersonaId);
      setDeletingPersonaId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingPersonaId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Student Personas</h2>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
            {personas.length}
          </span>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-ewu-red text-white rounded-xl font-medium hover:bg-ewu-red-dark touch-target"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Persona</span>
        </button>
      </div>

      {/* Empty state */}
      {personas.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Personas Yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create hypothetical student personas to plan course sequences and
            visualize degree progress.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-ewu-red text-white rounded-xl font-medium hover:bg-ewu-red-dark touch-target"
          >
            <Plus className="w-5 h-5" />
            Create Your First Persona
          </button>
        </div>
      )}

      {/* Persona grid */}
      {personas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={selectedPersonaId === persona.id}
              onSelect={() => onSelectPersona?.(persona)}
              onEdit={() => handleOpenEdit(persona)}
              onDelete={() => handleDeleteClick(persona.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <PersonaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        existingPersona={editingPersona}
        nextStudentNumber={nextStudentNumber}
      />

      {/* Delete Confirmation Dialog */}
      {deletingPersonaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Persona?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete this persona and all associated course
              data. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 touch-target"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
