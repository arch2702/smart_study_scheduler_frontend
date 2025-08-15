import { Link, useNavigate } from 'react-router-dom';
import { BookOpenIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsAPI, subjectsAPI } from '../services/api';

const SubjectCard = ({ subject }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch topics for this subject to compute live counts/progress
  const { data: topicsData } = useQuery({
    queryKey: ['topics', 'subject', subject._id],
    queryFn: () => topicsAPI.getBySubject(subject._id),
  });

  const topics = topicsData?.data?.topics || [];

  // Delete subject mutation
  const deleteMutation = useMutation({
    mutationFn: () => subjectsAPI.delete(subject._id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects']);
    },
  });
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

  // Calculate progress from fetched topics (fallback to subject fields if provided)
  const topicCountFetched = topics.length;
  const completedFetched = topics.filter((t) => t.completed).length;
  const topicCount = topicCountFetched || subject.topicCount || 0;
  const completedTopics = completedFetched || subject.completedTopics || 0;
  const progressPercentage = topicCount > 0 ? (completedTopics / topicCount) * 100 : 0;

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/subjects/${subject._id}`);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteMutation.isPending) return;
    const ok = window.confirm('Delete this subject and all its topics?');
    if (!ok) return;
    deleteMutation.mutate();
  };

  return (
    <Link
      to={`/subjects/${subject._id}`}
      className="card hover:shadow-md transition-shadow duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
          <BookOpenIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(subject.difficulty)}`}>
            {subject.difficulty}
          </span>
          <button
            onClick={handleEdit}
            title="Edit Subject"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <PencilSquareIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={handleDelete}
            title="Delete Subject"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <TrashIcon className="h-5 w-5 text-red-600" />
          </button>
        </div>
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
          <span>Topics:</span>
          <span className="font-medium">{completedTopics}/{topicCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Progress:</span>
          <span className="font-medium">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>End Date:</span>
          <span className="font-medium">{new Date(subject.endDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </Link>
  );
};

export default SubjectCard;
