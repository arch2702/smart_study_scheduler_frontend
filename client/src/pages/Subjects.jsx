import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsAPI } from '../services/api';
import SubjectCard from '../components/SubjectCard';
import { PlusIcon, BookOpenIcon } from '@heroicons/react/24/outline';

const Subjects = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    title: '',
    difficulty: 'medium',
    dailyHours: 1,
    startDate: '',
    endDate: ''
  });

  // Fetch subjects
  const { data: subjectsData, isLoading, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsAPI.getAll,
  });

  const subjects = subjectsData?.data?.subjects || [];

  // Create subject mutation
  const createSubjectMutation = useMutation({
    mutationFn: subjectsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
      setShowAddModal(false);
      setNewSubject({
        title: '',
        difficulty: 'medium',
        dailyHours: 1,
        startDate: '',
        endDate: ''
      });
    },
  });

  const handleAddSubject = (e) => {
    e.preventDefault();
    createSubjectMutation.mutate(newSubject);
  };

  const handleInputChange = (e) => {
    setNewSubject({
      ...newSubject,
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
          <p className="text-red-600 dark:text-red-400">Error loading subjects: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <h1 className="section-title mb-0">My Subjects</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Subject</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <SubjectCard key={subject._id} subject={subject} />
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No subjects yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first subject.
          </p>
          <div className="mt-6">
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Subject
            </button>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New Subject
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input-field"
                  placeholder="Enter subject title"
                  value={newSubject.title}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty
                </label>
                <select
                  name="difficulty"
                  className="input-field"
                  value={newSubject.difficulty}
                  onChange={handleInputChange}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Daily Study Hours
                </label>
                <input
                  type="number"
                  name="dailyHours"
                  min="0.5"
                  max="8"
                  step="0.5"
                  required
                  className="input-field"
                  value={newSubject.dailyHours}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="input-field"
                  value={newSubject.startDate}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  className="input-field"
                  value={newSubject.endDate}
                  onChange={handleInputChange}
                />
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
                  disabled={createSubjectMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {createSubjectMutation.isPending ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;
