import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Clock,
  Dumbbell,
  Flame,
  Plus,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axiosClient from "../api/axiosClient";

const StatCard = ({ icon: Icon, title, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} className="opacity-80" />
      </div>
    </div>
    <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium">
      <TrendingUp size={14} />
      <span>Keep it up!</span>
    </div>
  </motion.div>
);

const workoutTypes = [
  "Walking",
  "Running",
  "Cycling",
  "Yoga",
  "Gym",
  "Swimming",
  "Stretching",
  "Cardio",
  "Dance",
  "Sports",
  "Other",
];

export default function WorkoutPage() {
  const [aiData, setAiData] = useState({
    caloriesToBurn: "---",
    tip: "Log your meals to see how much you need to burn.",
  });

  const [stats, setStats] = useState({
    steps: "--",
    calories: "--",
    time: "--",
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggedWorkouts, setLoggedWorkouts] = useState([]);

  // Workout input form
  const [workoutForm, setWorkoutForm] = useState({
    workoutType: "Walking",
    duration: "",
    caloriesBurned: "",
  });
  const [savingWorkout, setSavingWorkout] = useState(false);

  const email = localStorage.getItem("email") || "demo-user";

  const fetchWeeklyActivity = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/weekly-activity/${email}`);
      setWeeklyData(res.data);
    } catch (err) {
      console.error("Weekly activity fetch failed", err);
    }
  }, [email]);

  const loadAllData = useCallback(async () => {
    let currentStats = null;

    // 1. Fetch Stats (Only Once)
    try {
      const res = await axiosClient.get(`/user/health-stats/${email}`);
      currentStats = res.data;
      setStats({
        steps: res.data.steps,
        calories: res.data.calories,
        time: res.data.time,
      });
      setLoggedWorkouts(res.data.workouts || []);
    } catch (err) {
      console.error("Stats fetch failed", err);
    }

    // 2. Fetch Weekly Activity (Parallel)
    fetchWeeklyActivity();

    // 3. Fetch Workout Advice using the stats we already downloaded
    setLoading(true);
    try {
      let pendingCals = "250";

      const res = await axiosClient.post("/workout-insight", {
        email: email,
        heartRate: 72,
        steps: currentStats ? currentStats.steps : 0,
      });

      if (currentStats) {
        const foodCalories = currentStats.total_food_calories || 0;
        const burnedCalories = currentStats.calories_burned || 0;
        const surplus = Math.max(0, foodCalories - 2000);
        const target = 500 + surplus;
        pendingCals = Math.max(0, target - burnedCalories).toString();
      }

      if (res.data && res.data.data) {
        setAiData({
          caloriesToBurn: pendingCals,
          tip: res.data.data.tip || res.data.data.insight,
        });
      }
    } catch (err) {
      console.error("Coach insight failed", err);
    } finally {
      setLoading(false);
    }
  }, [email, fetchWeeklyActivity]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const fetchWorkoutAdviceManual = async () => {
    loadAllData(); // Refresh everything when user clicks the refresh button
  };

  const handleLogWorkout = async (e) => {
    e.preventDefault();
    if (!workoutForm.duration) return alert("Please enter workout duration");
    setSavingWorkout(true);

    try {
      const res = await axiosClient.post("/log-workout", {
        email: email,
        workoutType: workoutForm.workoutType,
        duration: parseInt(workoutForm.duration),
        caloriesBurned:
          parseInt(workoutForm.caloriesBurned) ||
          Math.round(parseInt(workoutForm.duration) * 7),
      });

      if (res.data.status === "success") {
        setLoggedWorkouts((prev) => [...prev, res.data.workout]);
        setStats((prev) => ({
          ...prev,
          time: `${res.data.total_workout_time} mins`,
          calories: `${res.data.total_workout_calories} kcal`,
        }));
        setWorkoutForm({
          workoutType: "Walking",
          duration: "",
          caloriesBurned: "",
        });
        alert(
          `Logged ${res.data.workout.type} for ${res.data.workout.duration} mins!`,
        );
      }
    } catch (err) {
      console.error("Log workout error:", err);
      alert("Failed to log workout.");
    } finally {
      setSavingWorkout(false);
    }
  };

  return (
    <div className="space-y-8 p-2 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Workout Analytics
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Log workouts & get AI-powered fitness advice.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Activity}
          title="Total Steps"
          value={stats.steps}
          color="bg-blue-50 text-blue-600"
          delay={0.1}
        />
        <StatCard
          icon={Flame}
          title="Calories Burned"
          value={stats.calories}
          color="bg-orange-50 text-orange-600"
          delay={0.2}
        />
        <StatCard
          icon={Clock}
          title="Active Time"
          value={stats.time}
          color="bg-emerald-50 text-emerald-600"
          delay={0.3}
        />
      </div>

      {/* Log Workout Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
      >
        <div className="flex items-center gap-2 mb-6">
          <Dumbbell size={20} className="text-violet-500" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            Log Workout
          </h3>
        </div>
        <form
          onSubmit={handleLogWorkout}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Type
            </label>
            <select
              value={workoutForm.workoutType}
              onChange={(e) =>
                setWorkoutForm({ ...workoutForm, workoutType: e.target.value })
              }
              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-900 dark:text-white"
            >
              {workoutTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Duration (mins)
            </label>
            <input
              type="number"
              placeholder="e.g., 30"
              value={workoutForm.duration}
              onChange={(e) =>
                setWorkoutForm({ ...workoutForm, duration: e.target.value })
              }
              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Calories Burned (est.)
            </label>
            <input
              type="number"
              placeholder="auto-calculated"
              value={workoutForm.caloriesBurned}
              onChange={(e) =>
                setWorkoutForm({
                  ...workoutForm,
                  caloriesBurned: e.target.value,
                })
              }
              className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={savingWorkout}
            className="bg-violet-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {savingWorkout ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus size={16} /> Log
              </>
            )}
          </button>
        </form>

        {/* Today's Logged Workouts */}
        {loggedWorkouts.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
              Today&apos;s Workouts
            </h4>
            <div className="space-y-2">
              {loggedWorkouts.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Dumbbell size={16} className="text-violet-500" />
                    <span className="font-medium text-slate-800 dark:text-white text-sm">
                      {w.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>{w.duration} mins</span>
                    <span>{w.calories_burned} kcal</span>
                    <span className="text-xs">{w.logged_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">
            Weekly Activity
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === weeklyData.length - 1 ? "#10b981" : "#cbd5e1"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* AI Calorie Burning Coach */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-lg shadow-indigo-500/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap size={20} className="text-yellow-400 fill-yellow-400" />
              <h3 className="font-bold text-lg">Today Burn</h3>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-black">
                {aiData.caloriesToBurn}
              </span>
              <span className="text-indigo-200 ml-2 font-medium">
                kcal to burn
              </span>
            </div>

            <p className="text-indigo-100 text-sm mb-6 leading-relaxed italic">
              &quot;{aiData.tip}&quot;
            </p>

            <button
              onClick={fetchWorkoutAdviceManual}
              disabled={loading}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-3 px-4 rounded-xl w-full transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                "Get Calories to Burn"
              )}
            </button>
          </motion.div>

          {/* Daily Alert Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4 text-orange-500">
              <AlertCircle size={20} />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Health Alert
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Log your workouts consistently to improve your health score.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
