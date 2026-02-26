import axios from "axios";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Clock,
  Flame,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "Mon", steps: 4000 },
  { name: "Tue", steps: 3000 },
  { name: "Wed", steps: 5000 },
  { name: "Thu", steps: 2780 },
  { name: "Fri", steps: 1890 },
  { name: "Sat", steps: 2390 },
  { name: "Sun", steps: 3490 },
];

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
      <span>+12% from yesterday</span>
    </div>
  </motion.div>
);

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
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get(
        "http://localhost:8000/user/health-stats/demo-user",
      );
      setStats({
        steps: res.data.steps,
        calories: "420 kcal",
        time: "45 mins",
      });
    } catch (err) {
      console.error("Stats fetch failed", err);
    }
  };

  const fetchWorkoutAdvice = async () => {
    setLoading(true);
    try {
      const userEmail = localStorage.getItem("email"); // DB storage logic kosam
      const res = await axios.post("http://localhost:8000/workout-insight", {
        email: userEmail,
        heartRate: 72,
        steps: stats.steps === "Upcoming" ? 8432 : stats.steps,
        waterIntake: 1.5,
      });

      // Backend logic nundi caloriesToBurn and tip vastundi
      if (res.data && res.data.data) {
        setAiData({
          caloriesToBurn: res.data.data.caloriesToBurn || "250",
          tip: res.data.data.tip || res.data.data.insight,
        });
      }
    } catch (err) {
      console.error("Coach insight failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchWorkoutAdvice();
  }, []);

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
          Targeted AI advice for your fitness goals.
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
              <BarChart data={data}>
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
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === data.length - 1 ? "#10b981" : "#cbd5e1"}
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
              <h3 className="font-bold text-lg">Daily Burn Target</h3>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-black">
                {aiData.caloriesToBurn}
              </span>
              <span className="text-indigo-200 ml-2 font-medium">
                kcal to burn
              </span>
            </div>

            <p className="text-indigo-100 text-sm mb-6 leading-relaxed italic italic">
              " {aiData.tip} "
            </p>

            <button
              onClick={fetchWorkoutAdvice}
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
              Your recovery rate is slower today. Consider an extra hour of
              sleep tonight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
