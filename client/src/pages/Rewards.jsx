import { useAuth } from '../contexts/AuthContext';
import { TrophyIcon, StarIcon, FireIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { subjectsAPI, topicsAPI } from '../services/api';
import { useEffect } from 'react';

const Rewards = () => {
  const { user } = useAuth();

  // Fetch all subjects to calculate real stats
  const { data: subjectsData, refetch: refetchSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectsAPI.getAll,
    // Ensure fresh data so achievements update immediately
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    // Light polling to catch background updates after mutations in other routes
    refetchInterval: 3000,
  });

  // Fetch topics separately to ensure we have complete data
  const { data: allTopicsData, refetch: refetchTopics } = useQuery({
    queryKey: ['all-topics'],
    queryFn: async () => {
      // Get all subjects
      const subjectsResponse = await subjectsAPI.getAll();
      const subjects = subjectsResponse.data.subjects;
      
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
    // Ensure fresh data so achievements update immediately
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  // Calculate real stats from user data
  const calculateStats = () => {
    if (!user) {
      return {
        currentPoints: 0,
        totalPointsEarned: 0,
        totalRewards: 0,
        consistentLearnerDays: 0,
        topicsReviewed: 0,
        pointCollectorDays: 0,
      };
    }

    let totalPointsEarned = 0;
    let topicsCompleted = 0;
    let consistentLearnerDays = 0;
    let topicsReviewed = 0;
    let pointCollectorDays = 0;

    // Track daily points to calculate PointCollectorDays
    const dailyPoints = {};
    // Track daily completed topics to calculate ConsistentLearnerDays
    const dailyTopicsCompleted = {};

    // Calculate from all topics data
    if (allTopicsData?.topics) {
      allTopicsData.topics.forEach(topic => {
        if (topic.completed) {
          topicsCompleted++;
          const points = topic.points || 0;
          totalPointsEarned += points;

          // Group by completion date for PointCollectorDays calculation
          // Only track daily points if topic has a proper completedAt date
          if (topic.completedAt) {
            const completionDate = new Date(topic.completedAt).toDateString();
            
            // Track daily points for PointCollectorDays
            if (!dailyPoints[completionDate]) {
              dailyPoints[completionDate] = 0;
            }
            dailyPoints[completionDate] += points;
          }

          // For ConsistentLearnerDays, ONLY use completedAt if it exists
          // Don't fallback to current date as this creates incorrect daily counts
          if (topic.completedAt) {
            const completionDate = new Date(topic.completedAt).toDateString();
            
            // Track daily completed topics for ConsistentLearnerDays
            if (!dailyTopicsCompleted[completionDate]) {
              dailyTopicsCompleted[completionDate] = 0;
            }
            dailyTopicsCompleted[completionDate]++;
          }
        }
        if (topic.lastReviewed) {
          topicsReviewed++;
        }
      });
    }

    // Also add points/topics from user.rewardHistory if available
    if (user.rewardHistory && user.rewardHistory.length > 0) {
      user.rewardHistory.forEach(reward => {
        const points = reward.points || 0;
        const ts = reward.timestamp || reward.date;
        if (ts) {
          const rewardDate = new Date(ts).toDateString();

          // Track daily points from rewards (e.g., topic_completed, topic_reviewed)
          if (!dailyPoints[rewardDate]) {
            dailyPoints[rewardDate] = 0;
          }
          dailyPoints[rewardDate] += points;

          // If this reward represents a topic completion, also bump daily topic counts
          if (reward.action === 'topic_completed') {
            if (!dailyTopicsCompleted[rewardDate]) {
              dailyTopicsCompleted[rewardDate] = 0;
            }
            dailyTopicsCompleted[rewardDate] += 1;
          }
        }
      });
    }

    // Count days where user earned 100+ points
    pointCollectorDays = Object.values(dailyPoints).filter(dayPoints => dayPoints >= 100).length;

    // Count days where user completed 5+ topics
    consistentLearnerDays = Object.values(dailyTopicsCompleted).filter(dayTopics => dayTopics >= 5).length;

    // Fallback: If no proper dates exist, estimate based on total achievements
    // This is a temporary fix until proper date tracking is implemented
    if (pointCollectorDays === 0 && totalPointsEarned >= 100) {
      pointCollectorDays = 1; // Assume at least 1 day if user has 100+ total points
    }
    if (consistentLearnerDays === 0 && topicsCompleted >= 5) {
      consistentLearnerDays = 1; // Assume at least 1 day if user has 5+ total topics
    }

    // Get today's points earned
    const today = new Date().toDateString();
    const dailyPointsToday = dailyPoints[today] || 0;
    const dailyTopicsToday = dailyTopicsCompleted[today] || 0;

    // Also check user.rewardHistory for total rewards
    const totalRewards = user.rewardHistory?.length || 0;

    return {
      currentPoints: user.points || 0, // Show user's actual current points balance
      totalPointsEarned: totalPointsEarned,
      totalRewards: totalRewards,
      topicsCompleted: topicsCompleted,
      consistentLearnerDays: consistentLearnerDays,
      topicsReviewed: topicsReviewed,
      pointCollectorDays: pointCollectorDays,
      dailyPointsToday: dailyPointsToday,
      dailyTopicsToday: dailyTopicsToday,
    };
  };

  const stats = calculateStats();

  // Debug logging
  useEffect(() => {
    const today = new Date().toDateString();
    console.log('=== Rewards Debug Info ===');
    console.log('Today date string:', today);
    console.log('User:', user);
    console.log('User points:', user?.points);
    console.log('User rewardHistory:', user?.rewardHistory);
    
    // Debug all completed topics with their dates
    if (allTopicsData?.topics) {
      const completedTopics = allTopicsData.topics.filter(topic => topic.completed);
      console.log('All completed topics with dates:');
      completedTopics.forEach(topic => {
        const dateStr = topic.completedAt ? new Date(topic.completedAt).toDateString() : 'No date';
        console.log(`- ${topic.title}: ${dateStr} (points: ${topic.points || 0})`);
      });
    }
    
    console.log('Topics completed today:', allTopicsData?.topics?.filter(topic => 
      topic.completed && topic.completedAt && 
      new Date(topic.completedAt).toDateString() === today
    ));
    console.log('Calculated stats:', stats);
    console.log('Daily points today:', stats.dailyPointsToday);
    console.log('Daily topics today:', stats.dailyTopicsToday);
    console.log('=== End Debug ===');
  }, [user, subjectsData, allTopicsData, stats]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Rewards & Achievements</h1>
        <button
          onClick={() => {
            // Manual refresh to reflect newly completed topics immediately
            Promise.all([refetchSubjects(), refetchTopics()]);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Points Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <TrophyIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.currentPoints}</h3>
          <p className="text-gray-600 dark:text-gray-400">Total Points</p>
        </div>

        <div className="card text-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <StarIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pointCollectorDays}</h3>
          <p className="text-gray-600 dark:text-gray-400">Point Collector Days</p>
        </div>

        <div className="card text-center">
        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <FireIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.consistentLearnerDays}</h3>
          <p className="text-gray-600 dark:text-gray-400">Consistent Learner Days</p>
        </div>

        <div className="card text-center">
        <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-3 w-16 h-16 flex items-center justify-center">
            <TrophyIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.dailyPointsToday}</h3>
          <p className="text-gray-600 dark:text-gray-400">Daily Points</p>
        </div>
      </div>

      {/* Recent Rewards */}
      <div className="mb-8">
        <h2 className="section-title">Recent Rewards</h2>
        <div className="card">
          <div className="space-y-4">
            {(() => {
              // Always show recent completed topics as rewards since rewardHistory might not be properly populated
              const recentTopics = [];
              if (allTopicsData?.topics) {
                allTopicsData.topics.forEach(topic => {
                  if (topic.completed && topic.points > 0) {
                    recentTopics.push({
                      description: `Completed topic: ${topic.title}`,
                      points: topic.points,
                      subject: topic.subjectTitle || 'Unknown Subject',
                      difficulty: topic.difficulty || 'Medium'
                    });
                  }
                });
              }
              
              // Sort by points (highest first) and take top 3
              const sortedTopics = recentTopics
                .sort((a, b) => b.points - a.points)
                .slice(0, 3);

              return sortedTopics.length > 0 ? (
                sortedTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <TrophyIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{topic.description}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {topic.subject} • {topic.difficulty}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        +{topic.points}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <TrophyIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No rewards yet. Complete some topics to earn points!</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Achievement System */}
      <div>
        <h2 className="section-title">Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* First Steps Achievement */}
          <div className="card text-center">
            <div className={`p-4 rounded-lg mx-auto mb-4 w-20 h-20 flex items-center justify-center ${
              stats.dailyTopicsToday >= 1 ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <TrophyIcon className={`h-10 w-10 ${
                stats.dailyTopicsToday >= 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
              }`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">First Steps</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Complete your first topic today</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-green-400" 
                style={{ width: `${Math.min((stats.dailyTopicsToday / 1) * 100, 100)}%` }}
              ></div>
            </div>
            <span className={`text-xs mt-2 block ${
              stats.dailyTopicsToday >= 1 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {stats.dailyTopicsToday >= 1 ? 'Achieved!' : `${stats.dailyTopicsToday}/1 topic`}
            </span>
          </div>

          {/* Point Collector Achievement */}
          <div className="card text-center">
            <div className={`p-4 rounded-lg mx-auto mb-4 w-20 h-20 flex items-center justify-center ${
              stats.dailyPointsToday >= 100 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <StarIcon className={`h-10 w-10 ${
                stats.dailyPointsToday >= 100 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Point Collector</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Earn 100 points today</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-400" 
                style={{ width: `${Math.min((stats.dailyPointsToday / 100) * 100, 100)}%` }}
              ></div>
            </div>
            <span className={`text-xs mt-2 block ${
              stats.dailyPointsToday >= 100 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-blue-500 dark:text-blue-400'
            }`}>
              {stats.dailyPointsToday >= 100 ? 'Achieved!' : `${stats.dailyPointsToday}/100 points`}
            </span>
          </div>

          {/* Consistent Learner Achievement */}
          <div className="card text-center">
            <div className={`p-4 rounded-lg mx-auto mb-4 w-20 h-20 flex items-center justify-center ${
              stats.dailyTopicsToday >= 5 ? 'bg-purple-100 dark:bg-purple-900' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <FireIcon className={`h-10 w-10 ${
                stats.dailyTopicsToday >= 5 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
              }`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Consistent Learner</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Complete 5 topics today</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-purple-400" 
                style={{ width: `${Math.min((stats.dailyTopicsToday / 5) * 100, 100)}%` }}
              ></div>
            </div>
            <span className={`text-xs mt-2 block ${
              stats.dailyTopicsToday >= 5 
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-purple-500 dark:text-purple-400'
            }`}>
              {stats.dailyTopicsToday >= 5 ? 'Achieved!' : `${stats.dailyTopicsToday}/5 topics`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
