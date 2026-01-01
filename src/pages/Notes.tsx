import { useState, useEffect } from 'react';
import { StickyNote, Plus, Search, Trash2, Edit2, Save, X, Tag } from 'lucide-react';
import { useCourses } from '../contexts/ScheduleContext';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { downloadJson } from '../utils/download';

interface Note {
  id: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  attachedTo: {
    type: 'course' | 'instructor' | 'general';
    id?: string;
    label: string;
  };
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = STORAGE_KEYS.scheduleNotes;

export default function Notes() {
  const courses = useCourses();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNote, setNewNote] = useState({
    content: '',
    priority: 'medium' as Note['priority'],
    attachedTo: 'general' as string,
    tags: '',
  });

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved notes:', e);
      }
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    if (filterPriority !== 'all' && note.priority !== filterPriority) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.content.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        note.attachedTo.label.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Add new note
  const handleAddNote = () => {
    if (!newNote.content.trim()) return;

    const attachedTo: Note['attachedTo'] =
      newNote.attachedTo === 'general'
        ? { type: 'general', label: 'General Note' }
        : {
            type: 'course',
            id: newNote.attachedTo,
            label:
              courses.find((c) => c.id === newNote.attachedTo)?.displayCode ||
              'Unknown Course',
          };

    const note: Note = {
      id: Date.now().toString(),
      content: newNote.content,
      priority: newNote.priority,
      tags: newNote.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      attachedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes([note, ...notes]);
    setNewNote({ content: '', priority: 'medium', attachedTo: 'general', tags: '' });
    setShowNewNote(false);
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(notes.filter((n) => n.id !== id));
    }
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    setNotes(
      notes.map((n) =>
        n.id === id
          ? { ...n, content: editContent, updatedAt: new Date().toISOString() }
          : n
      )
    );
    setIsEditing(null);
    setEditContent('');
  };

  // Export notes
  const handleExport = () => {
    downloadJson(notes, `ewu-notes-${new Date().toISOString().split('T')[0]}.json`);
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes & Annotations</h1>
          <p className="text-gray-600 mt-1">
            {notes.length} note{notes.length !== 1 ? 's' : ''} saved locally
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-secondary" disabled={notes.length === 0}>
            Export Notes
          </button>
          <button onClick={() => setShowNewNote(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="select w-auto"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* New note form */}
      {showNewNote && (
        <div className="card p-4 mb-6 border-2 border-ewu-red">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Note</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Content</label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                className="input min-h-[100px]"
                placeholder="Enter your note..."
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">Priority</label>
                <select
                  value={newNote.priority}
                  onChange={(e) =>
                    setNewNote({ ...newNote, priority: e.target.value as Note['priority'] })
                  }
                  className="select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="label">Attach to</label>
                <select
                  value={newNote.attachedTo}
                  onChange={(e) => setNewNote({ ...newNote, attachedTo: e.target.value })}
                  className="select"
                >
                  <option value="general">General Note</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.displayCode} - {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newNote.tags}
                  onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                  className="input"
                  placeholder="e.g., important, review"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewNote(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddNote} className="btn btn-primary">
                <Save className="w-4 h-4" />
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="card p-12 text-center">
          <StickyNote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {notes.length === 0 ? 'No Notes Yet' : 'No Notes Match Filter'}
          </h2>
          <p className="text-gray-600 mb-4">
            {notes.length === 0
              ? 'Create notes to track important information about courses and scheduling.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {notes.length === 0 && (
            <button onClick={() => setShowNewNote(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Your First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <div key={note.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <StickyNote className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    {isEditing === note.id ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="input min-h-[80px] w-full"
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`badge ${priorityColors[note.priority]}`}>
                        {note.priority}
                      </span>
                      <span className="badge bg-gray-100 text-gray-700">
                        {note.attachedTo.label}
                      </span>
                      {note.tags.map((tag) => (
                        <span key={tag} className="badge bg-purple-100 text-purple-700">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Created {new Date(note.createdAt).toLocaleDateString()}
                      {note.updatedAt !== note.createdAt && (
                        <> • Updated {new Date(note.updatedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isEditing === note.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="btn btn-ghost btn-sm text-green-600"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditing(null)}
                        className="btn btn-ghost btn-sm text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(note.id);
                          setEditContent(note.content);
                        }}
                        className="btn btn-ghost btn-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="btn btn-ghost btn-sm text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
