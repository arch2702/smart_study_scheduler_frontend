import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, AcademicCapIcon } from '@heroicons/react/24/outline';


const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Subjects', href: '/subjects' },
    { name: 'Notes', href: '/notes' },
    { name: 'Upload Summary', href: '/upload-summary' },
    { name: 'Rewards', href: '/rewards' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <div className="mx-auto h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center shadow-lg">
            <AcademicCapIcon className="h-7 w-7 text-white" />
          </div>
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                Smart Study Scheduler
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side - User info, theme toggle, logout */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* User Points */}
            <div className="hidden sm:flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900 px-3 py-2 rounded-lg">
              <span className="text-yellow-800 dark:text-yellow-200 text-sm font-medium whitespace-nowrap">
                {user?.points || 0} pts
              </span>
            </div>

            {/* User Menu */}
            <div className="hidden sm:flex items-center space-x-3">
              {/* <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, {user?.name}
              </span> */}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
            
          </div>
        </div>

        
      </div>
    </header>
  );
};

export default Header;
