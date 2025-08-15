import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesAPI } from '../services/api';
import {
  PlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Notes = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [viewingNote, setViewingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    subject: '',
    topic: ''
  });

  // Fetch notes
  const { data: notesData, isLoading, error } = useQuery({
    queryKey: ['notes'],
    queryFn: notesAPI.getAll,
  });

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: (payload) => notesAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      setShowAddModal(false);
      setNewNote({ title: '', content: '', subject: '', topic: '' });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => notesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      setEditingNote(null);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: notesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
    },
  });

  const notes = notesData?.data?.notes || [];

  // Filter notes based on search term
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNote = (e) => {
    e.preventDefault();
    createNoteMutation.mutate({
      title: newNote.title,
      content: newNote.content,
      subject: newNote.subject || undefined,
      topic: newNote.topic || undefined,
    });
  };

  const handleUpdateNote = (e) => {
    e.preventDefault();
    updateNoteMutation.mutate({
      id: editingNote._id,
      data: editingNote
    });
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const handleInputChange = (e, isEditing = false) => {
    const target = isEditing ? editingNote : newNote;
    const setTarget = isEditing ? setEditingNote : setNewNote;
    
    setTarget({
      ...target,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Error loading notes: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <h1 className="section-title mb-0">My Notes</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Note</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <div key={note._id} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewingNote(note)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="View note"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingNote(note)}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Edit note"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteNote(note._id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Delete note"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {note.title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
              {note.content}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {note.subject || 'No subject'}
              </span>
              <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                {note.topic || 'No topic'}
              </span>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {new Date(note.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms.' : 'Start taking notes to organize your learning.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Note
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Note
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input-field"
                  placeholder="Enter note title"
                  value={newNote.title}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  name="content"
                  rows={8}
                  required
                  className="input-field resize-none"
                  placeholder="Enter note content..."
                  value={newNote.content}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    name="subject"
                    className="input-field"
                    placeholder="Link to subject"
                    value={newNote.subject}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic (optional)
                  </label>
                  <input
                    type="text"
                    name="topic"
                    className="input-field"
                    placeholder="Link to topic"
                    value={newNote.topic}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createNoteMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Note
              </h3>
              <button
                onClick={() => setEditingNote(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input-field"
                  placeholder="Enter note title"
                  value={editingNote.title}
                  onChange={(e) => handleInputChange(e, true)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  name="content"
                  rows={8}
                  required
                  className="input-field resize-none"
                  placeholder="Enter note content..."
                  value={editingNote.content}
                  onChange={(e) => handleInputChange(e, true)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    name="subject"
                    className="input-field"
                    placeholder="Link to subject"
                    value={editingNote.subject || ''}
                    onChange={(e) => handleInputChange(e, true)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topic (optional)
                  </label>
                  <input
                    type="text"
                    name="topic"
                    className="input-field"
                    placeholder="Link to topic"
                    value={editingNote.topic || ''}
                    onChange={(e) => handleInputChange(e, true)}
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateNoteMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {updateNoteMutation.isPending ? 'Updating...' : 'Update Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {viewingNote.title}
              </h3>
              <button
                onClick={() => setViewingNote(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Created: {new Date(viewingNote.createdAt).toLocaleDateString()}</span>
                {viewingNote.updatedAt && (
                  <span>Updated: {new Date(viewingNote.updatedAt).toLocaleDateString()}</span>
                )}
              </div>

              {(viewingNote.subject || viewingNote.topic) && (
                <div className="flex items-center space-x-4">
                  {viewingNote.subject && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">
                      Subject: {viewingNote.subject}
                    </span>
                  )}
                  {viewingNote.topic && (
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm">
                      Topic: {viewingNote.topic}
                    </span>
                  )}
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans">
                    {viewingNote.content}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setEditingNote(viewingNote);
                    setViewingNote(null);
                  }}
                  className="btn-secondary flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => setViewingNote(null)}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
