import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsAPI, topicsAPI, authAPI } from '../services/api';
import {
  PlusIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  PencilIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SubjectDetails = () => {
  const { id } = useParams();
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [newTopic, setNewTopic] = useState({
    title: '',
    difficulty: 'medium',
    notes: ''
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  // Fetch subject details
  const { data: subjectData, isLoading: subjectLoading } = useQuery({
    queryKey: ['subject', id],
    queryFn: () => subjectsAPI.getById(id),
  });

  // Fetch topics for this subject
  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics', id, forceUpdate],
    queryFn: () => topicsAPI.getBySubject(id),
  });

  // Mutations
  const createTopicMutation = useMutation({
    mutationFn: topicsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['topics', id]);
      setShowAddTopicModal(false);
      setNewTopic({ title: '', difficulty: 'medium', notes: '' });
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }) => topicsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['topics', id]);
      setEditingTopic(null);
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: topicsAPI.markComplete,
    onSuccess: (res) => {
      console.log('Mark complete response:', res?.data);
      
      // Get the updated topic from response
      const updated = res?.data?.topic;
      if (updated) {
        console.log('Updating topic in cache:', updated);
        console.log('Updated topic points:', updated.points);
        
        // Update the cache immediately
        queryClient.setQueryData(['topics', id], (prev) => {
          if (!prev?.data?.topics) return prev;
          
          const nextTopics = prev.data.topics.map((t) => {
            if (t._id === updated._id) {
              console.log('Replacing topic:', t.title, 'with points:', updated.points);
              return updated;
            }
            return t;
          });
          
          console.log('Updated topics in cache:', nextTopics);
          return { ...prev, data: { ...prev.data, topics: nextTopics } };
        });
        
        // Refresh user in auth context so Rewards page updates immediately
        authAPI
          .getMe()
          .then((me) => {
            if (me?.data?.user) updateUser(me.data.user);
          })
          .catch(() => {});
      }
      
      // Force a refresh after a short delay to ensure UI updates
      setTimeout(() => {
        queryClient.invalidateQueries(['topics', id]);
        queryClient.invalidateQueries(['subjects']);
        // Also refresh aggregated topics used by Rewards page
        queryClient.invalidateQueries(['all-topics']);
        setForceUpdate(prev => prev + 1); // Force component re-render
      }, 500);
    },
  });

  const recordReviewMutation = useMutation({
    mutationFn: topicsAPI.recordReview,
    onSuccess: () => {
      queryClient.invalidateQueries(['topics', id]);
      queryClient.invalidateQueries(['subjects']);
      // Ensure Rewards page reflects review counts/points
      queryClient.invalidateQueries(['all-topics']);
      // Refresh user so reward history/points reflect review rewards
      authAPI
        .getMe()
        .then((me) => {
          if (me?.data?.user) updateUser(me.data.user);
        })
        .catch(() => {});
    },
  });

  const subject = subjectData?.data?.subject;
  const topics = topicsData?.data?.topics || [];
  
  // Debug: Log topics data
  console.log('Current topics data:', topics);
  console.log('Topics with points:', topics.map(t => ({ title: t.title, points: t.points, completed: t.completed })));

  // Subject update mutation
  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => subjectsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subject', id]);
      queryClient.invalidateQueries(['subjects']);
      setShowEditSubjectModal(false);
    },
  });

  const onEditSubject = () => {
    if (!subject) return;
    setSubjectForm({
      title: subject.title || '',
      difficulty: subject.difficulty || 'medium',
      dailyHours: subject.dailyHours || 1,
      startDate: subject.startDate ? subject.startDate.substring(0, 10) : '',
      endDate: subject.endDate ? subject.endDate.substring(0, 10) : '',
    });
    setShowEditSubjectModal(true);
  };

  const handleSubjectInputChange = (e) => {
    setSubjectForm({ ...subjectForm, [e.target.name]: e.target.value });
  };

  const handleUpdateSubject = (e) => {
    e.preventDefault();
    updateSubjectMutation.mutate({ id, data: subjectForm });
  };

  const handleAddTopic = (e) => {
    e.preventDefault();
    createTopicMutation.mutate({
      ...newTopic,
      subject: id
    });
  };

  const handleUpdateTopic = (e) => {
    e.preventDefault();
    updateTopicMutation.mutate({
      id: editingTopic._id,
      data: editingTopic
    });
  };

  const handleMarkComplete = (topicId) => {
    console.log('Marking topic complete:', topicId);
    markCompleteMutation.mutate(topicId);
  };

  const handleRecordReview = (topicId) => {
    recordReviewMutation.mutate(topicId);
  };

  const handleInputChange = (e, isEditing = false) => {
    const target = isEditing ? editingTopic : newTopic;
    const setTarget = isEditing ? setEditingTopic : setNewTopic;
    
    setTarget({
      ...target,
      [e.target.name]: e.target.value,
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const isTopicDueForReview = (topic) => {
    if (!topic.nextReview) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextReview = new Date(topic.nextReview);
    nextReview.setHours(0, 0, 0, 0);
    return nextReview <= today;
  };

  if (subjectLoading || topicsLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">Subject not found</p>
        </div>
      </div>
    );
  }

  const completedTopics = topics.filter(topic => topic.completed).length;
  const totalPoints = topics.reduce((sum, topic) => sum + (topic.points || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/subjects"
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{subject.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{subject.description || 'No description available'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onEditSubject}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Edit Subject
            </button>
            <button
              onClick={() => setShowAddTopicModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Topic</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <BookOpenIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{topics.length}</h3>
          <p className="text-gray-600 dark:text-gray-400">Total Topics</p>
        </div>

        <div className="card text-center">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{completedTopics}</h3>
          <p className="text-gray-600 dark:text-gray-400">Completed</p>
        </div>

        <div className="card text-center">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <TrophyIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalPoints}</h3>
          <p className="text-gray-600 dark:text-gray-400">Points Earned</p>
        </div>

        <div className="card text-center">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <ClockIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{subject.dailyHours}h</h3>
          <p className="text-gray-600 dark:text-gray-400">Daily Goal</p>
        </div>
      </div>

      {/* Subject Info */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Subject Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Difficulty</h3>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getDifficultyColor(subject.difficulty)}`}>
              {subject.difficulty}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Daily Study Hours</h3>
            <p className="text-gray-600 dark:text-gray-400">{subject.dailyHours} hours</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Start Date</h3>
            <p className="text-gray-600 dark:text-gray-400">{new Date(subject.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">End Date</h3>
            <p className="text-gray-600 dark:text-gray-400">{new Date(subject.endDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Topics List */}
      <div>
        <h2 className="section-title">Topics</h2>
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic._id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    topic.completed
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {topic.completed ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <BookOpenIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{topic.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{topic.notes}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(topic.difficulty)}`}>
                        {topic.difficulty}
                      </span>
                      {topic.completed && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          +{topic.points} points
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {topic.completed ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Next Review</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {topic.nextReview ? new Date(topic.nextReview).toLocaleDateString() : 'Not scheduled'}
                        </p>
                      </div>
                      {isTopicDueForReview(topic) && (
                        <button
                          onClick={() => handleRecordReview(topic._id)}
                          disabled={recordReviewMutation.isPending}
                          className="btn-primary text-sm"
                        >
                          {recordReviewMutation.isPending ? 'Reviewing...' : 'Review Now'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleMarkComplete(topic._id)}
                        disabled={markCompleteMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        {markCompleteMutation.isPending ? 'Marking...' : 'Mark Complete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {topics.length === 0 && (
          <div className="card text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No topics yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add your first topic to get started.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddTopicModal(true)}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Topic
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Topic Modal */}
      {showAddTopicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New Topic
              </h3>
              <button
                onClick={() => setShowAddTopicModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input-field"
                  placeholder="Enter topic title"
                  value={newTopic.title}
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
                  value={newTopic.difficulty}
                  onChange={handleInputChange}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Add notes about this topic..."
                  value={newTopic.notes}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTopicModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTopicMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {createTopicMutation.isPending ? 'Adding...' : 'Add Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && subjectForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Subject</h3>
              <button
                onClick={() => setShowEditSubjectModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input-field"
                  value={subjectForm.title}
                  onChange={handleSubjectInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                <select
                  name="difficulty"
                  className="input-field"
                  value={subjectForm.difficulty}
                  onChange={handleSubjectInputChange}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Hours</label>
                <input
                  type="number"
                  name="dailyHours"
                  min="0.5"
                  max="8"
                  step="0.5"
                  required
                  className="input-field"
                  value={subjectForm.dailyHours}
                  onChange={handleSubjectInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="input-field"
                  value={subjectForm.startDate}
                  onChange={handleSubjectInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  required
                  className="input-field"
                  value={subjectForm.endDate}
                  onChange={handleSubjectInputChange}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditSubjectModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubjectMutation.isPending}
                  className="flex-1 btn-primary"
                >
                  {updateSubjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetails;
