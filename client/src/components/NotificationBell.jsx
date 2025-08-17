import { useEffect, useRef, useState } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { notificationsAPI } from '../services/api';

const POLL_INTERVAL_MS = 30000; // 30s lightweight polling; can be swapped with websockets later

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const computeUnread = (list) => (list || []).filter((n) => !n.read).length;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await notificationsAPI.getAll();
      let items = [];
      if (Array.isArray(data?.notifications)) {
        items = data.notifications;
      } else if (Array.isArray(data?.data?.notifications)) {
        // some APIs wrap payload inside data
        items = data.data.notifications;
      } else if (Array.isArray(data)) {
        items = data;
      } else {
        // unexpected shape; avoid crashing and surface a hint
        console.warn('Notifications API returned unexpected shape:', data);
        items = [];
      }
      setNotifications(items);
      setUnreadCount(computeUnread(items));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markOneRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n._id === id ? { ...n, read: true } : n));
        setUnreadCount(computeUnread(updated));
        return updated;
      });
    } catch (e) {
      // no-op UI change; optionally surface toast
    }
  };

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!open) return;
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
        title="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 text-white text-[10px] px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50"
        >
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notifications</span>
            <button
              onClick={fetchNotifications}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="p-3 text-xs text-red-600">{error}</div>
          )}

          {!loading && (!Array.isArray(notifications) || notifications.length === 0) && !error && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No notifications yet.</div>
          )}

          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {(Array.isArray(notifications) ? notifications : []).map((n) => (
              <li key={n._id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <button
                  onClick={() => markOneRead(n._id)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {!n.read ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    ) : (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {n.title || 'Notification'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {n.message || ''}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
