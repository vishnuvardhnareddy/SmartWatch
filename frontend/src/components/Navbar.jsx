import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const navigate = useNavigate();

  // Fetch the logged-in user's name on component mount
  useEffect(() => {
    const storedName = localStorage.getItem("username");
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  // Logout Functionality
  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear Auth Token
    localStorage.removeItem("username"); // Clear User Data
    navigate("/login"); // Redirect to Login page
  };

  return (
    <header className="h-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700 flex items-center justify-end px-8 sticky top-0 z-10 w-full">
      {/* Right Actions */}
      <div className="flex items-center gap-6">
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-700 dark:text-white capitalize">
                {userName}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Account
                  </p>
                </div>

                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} /> My Profile
                </Link>

                <div className="border-t border-slate-50 dark:border-slate-700 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
