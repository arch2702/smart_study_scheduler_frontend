import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsAPI, topicsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpenIcon,
  DocumentTextIcon,
  TrophyIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    title: '',
    difficulty: 'medium',
    dailyHours: 1,
    startDate: '',
    endDate: ''
  });

  // Fetch all subjects
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsAPI.getAll,
  });

  // Fetch all topics for stats calculation
  const { data: allTopicsData } = useQuery({
    queryKey: ['all-topics-dashboard'],
    queryFn: async () => {
      if (!subjectsData?.data?.subjects) return { topics: [] };
      
      // Get all subjects
      const subjects = subjectsData.data.subjects;
      
      // Fetch topics for each subject
      const allTopics = [];
      for (const subject of subjects) {
        try {
          const topicsResponse = await topicsAPI.getBySubject(subject._id);
          if (topicsResponse.data.topics) {
            allTopics.push(...topicsResponse.data.topics.map(topic => ({
              ...topic,
              subjectTitle: subject.title
            })));
          }
        } catch (error) {
          console.error(`Error fetching topics for subject ${subject._id}:`, error);
        }
      }
      
      return { topics: allTopics };
    },
    enabled: !!subjectsData?.data?.subjects,
  });

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

  // Filter subjects for today's plan
  const getTodaysSubjects = () => {
    if (!subjectsData?.data?.subjects) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return subjectsData.data.subjects.filter(subject => {
      const startDate = new Date(subject.startDate);
      const endDate = new Date(subject.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return today >= startDate && today <= endDate;
    });
  };

  const todaysSubjects = getTodaysSubjects();

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

  // Calculate real stats from data
  const calculateStats = () => {
    const totalSubjects = subjectsData?.data?.subjects?.length || 0;
    const totalPoints = user?.points || 0;
    
    if (!allTopicsData?.topics) {
      return {
        totalSubjects,
        totalTopics: 0,
        completedTopics: 0,
        totalPoints,
        dueReviews: 0,
      };
    }
    
    const topics = allTopicsData.topics;
    const totalTopics = topics.length;
    const completedTopics = topics.filter(topic => topic.completed).length;
    
    // Calculate due reviews (topics that need review based on spaced repetition)
    const now = new Date();
    let dueReviews = topics.filter(topic => {
      if (!topic.completed || !topic.nextReviewDate) return false;
      const reviewDate = new Date(topic.nextReviewDate);
      return reviewDate <= now;
    }).length;
    
    // Fallback: If no topics have nextReviewDate, estimate based on completed topics
    // that haven't been reviewed recently or at all
    if (dueReviews === 0 && completedTopics > 0) {
      const dueTopics = topics.filter(topic => {
        if (!topic.completed) return false;
        
        // If topic has never been reviewed, it's due for review
        if (!topic.lastReviewed) return true;
        
        // If topic was reviewed more than 1 day ago, it's due for review
        const lastReviewDate = new Date(topic.lastReviewed);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return lastReviewDate < oneDayAgo;
      });
      
      // Debug logging to see what's being counted
      console.log('=== Due Reviews Debug ===');
      console.log('Total completed topics:', completedTopics);
      console.log('Topics due for review:');
      dueTopics.forEach(topic => {
        const reviewStatus = !topic.lastReviewed 
          ? 'Never reviewed' 
          : `Last reviewed: ${new Date(topic.lastReviewed).toLocaleString()}`;
        console.log(`- ${topic.title}: ${reviewStatus}`);
      });
      console.log('Due reviews count:', dueTopics.length);
      console.log('=== End Debug ===');
      
      dueReviews = dueTopics.length;
    }
    
    return {
      totalSubjects,
      totalTopics,
      completedTopics,
      totalPoints,
      dueReviews,
    };
  };

  const stats = calculateStats();

  const quickActions = [
    {
      name: 'Add Subject',
      href: '#',
      icon: PlusIcon,
      color: 'bg-blue-500',
      onClick: () => setShowAddModal(true),
    },
    {
      name: 'Create Note',
      href: '/notes',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      onClick: () => navigate('/notes'),
    },
    {
      name: 'View Rewards',
      href: '/rewards',
      icon: TrophyIcon,
      color: 'bg-yellow-500',
      onClick: () => navigate('/rewards'),
    },
  ];

  if (subjectsLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ready to continue your learning journey?
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BookOpenIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Subjects
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalSubjects}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Topics Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.completedTopics}/{stats.totalTopics}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Points
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalPoints}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <ClockIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Due Reviews
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.dueReviews}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Plan */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="section-title mb-0">Today's Plan</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Quick Add Subject</span>
          </button>
        </div>

        {todaysSubjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todaysSubjects.map((subject) => (
              <Link
                key={subject._id}
                to={`/subjects/${subject._id}`}
                className="card hover:shadow-md transition-shadow duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                    <BookOpenIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    subject.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    subject.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {subject.difficulty}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                  {subject.title}
                </h3>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Daily Hours:</span>
                    <span className="font-medium">{subject.dailyHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Date:</span>
                    <span className="font-medium">{new Date(subject.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No subjects for today</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add a subject to get started with your study plan.
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
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <div
              key={action.name}
              className="card hover:shadow-md transition-shadow duration-200 cursor-pointer group"
              onClick={action.onClick}
            >
              <div className="flex items-center">
                <div className={`p-3 ${action.color} rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get started quickly
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <XMarkIcon className="h-6 w-6" />
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

export default Dashboard;
