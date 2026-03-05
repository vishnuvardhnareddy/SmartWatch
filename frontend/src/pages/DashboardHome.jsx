import { motion } from "framer-motion";
import {
  Activity,
  Apple,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Footprints,
  Heart,
  ThumbsUp,
  Utensils,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";

const HealthCard = ({ icon: Icon, title, value, unit, status, color }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 ${color}`}>
      <Icon size={64} />
    </div>
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`p-3 rounded-xl ${color} bg-opacity-20 text-${color.split("-")[1]}-600`}
      >
        <Icon
          size={24}
          className={color.replace("bg-", "text-").replace("-50", "-600")}
        />
      </div>
      <h3 className="font-semibold text-slate-700 dark:text-slate-300">
        {title}
      </h3>
    </div>
    <div className="mb-2">
      <span className="text-3xl font-bold text-slate-900 dark:text-white">
        {value}
      </span>
      <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">
        {unit}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <div
        className={`text-xs font-semibold px-2 py-1 rounded-full ${
          status === "Good" || status === "Excellent"
            ? "bg-emerald-100 text-emerald-700"
            : status === "Need to Improve" || status === "Syncing..."
              ? "bg-orange-100 text-orange-700"
              : "bg-red-100 text-red-700"
        }`}
      >
        {status}
      </div>
    </div>
  </motion.div>
);

const QuickActionCard = ({
  title,
  description,
  linkText,
  to,
  icon: Icon,
  color,
}) => (
  <Link to={to} className="block group">
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col items-start"
    >
      <div className={`p-3 rounded-xl ${color} bg-opacity-20 mb-4`}>
        <Icon
          size={24}
          className={color.replace("bg-", "text-").replace("-50", "-600")}
        />
      </div>
      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 group-hover:text-primary-600 transition-colors">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1">
        {description}
      </p>
      <div className="flex items-center gap-2 text-primary-600 font-medium text-sm">
        {linkText}{" "}
        <ChevronRight
          size={16}
          className="group-hover:translate-x-1 transition-transform"
        />
      </div>
    </motion.div>
  </Link>
);

export default function DashboardHome() {
  const [stats, setStats] = useState({
    heartRate: "--",
    bloodPressure: "--/--",
    steps: "Upcoming",
    healthScore: "--",
    bmi: null,
    status: {
      heart: "Loading",
      bp: "Loading",
      steps: "Pending",
      score: "Calculating",
    },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const email = localStorage.getItem("email") || "demo-user";
        const response = await axiosClient.get(`/user/health-stats/${email}`);
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching health data:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Health Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Here's your daily health summary.
        </p>
      </motion.div>

      {/* Quick Meal Logger */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex-1 w-full relative">
          <div className="flex items-center gap-2 mb-2">
            <Utensils size={18} className="text-emerald-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">
              Quick Log
            </h3>
            <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
              {new Date().getHours() < 11
                ? "Breakfast"
                : new Date().getHours() < 16
                  ? "Lunch"
                  : "Dinner"}
            </span>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const input = e.target.mealInput.value;
              if (!input) return;

              const btn = e.target.submitBtn;
              btn.disabled = true;
              btn.innerText = "Analyzing...";

              const mealType =
                new Date().getHours() < 11
                  ? "breakfast"
                  : new Date().getHours() < 16
                    ? "lunch"
                    : "dinner";

              try {
                const res = await axiosClient.post("/log-meal", {
                  email: localStorage.getItem("email") || "demo-user",
                  mealType,
                  foodDesc: input,
                });
                if (res.data.status === "success") {
                  setStats((prev) => ({
                    ...prev,
                    total_food_calories: res.data.new_total,
                  }));
                  e.target.reset();
                  alert(
                    `Added ${res.data.added_calories} kcal for your ${mealType}!`,
                  );
                }
              } catch (err) {
                console.error(err);
              } finally {
                btn.disabled = false;
                btn.innerText = "Log & Analyze";
              }
            }}
            className="flex gap-3"
          >
            <input
              name="mealInput"
              type="text"
              placeholder="E.g., 2 idlis with sambar and a banana"
              className="flex-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full text-slate-900 dark:text-white"
            />
            <button
              name="submitBtn"
              type="submit"
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              Log & Analyze
            </button>
          </form>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl min-w-[140px]">
          <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
            Today's Intake
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">
              {stats.total_food_calories || 0}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              kcal
            </span>
          </div>
        </div>
      </motion.div>

      {/* Health Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <HealthCard
          icon={Heart}
          title="Heart Rate"
          value={stats.heartRate}
          unit="bpm"
          status={stats.status.heart}
          color="bg-rose-50 text-red-600"
        />
        <HealthCard
          icon={Activity}
          title="Blood Pressure"
          value={stats.bloodPressure}
          unit="mmHg"
          status={stats.status.bp}
          color="bg-blue-50 text-blue-600"
        />
        <HealthCard
          icon={Footprints}
          title="Steps"
          value={stats.steps}
          unit=""
          status={stats.status.steps}
          color="bg-orange-50 text-orange-600"
        />
        <HealthCard
          icon={Activity}
          title="BMI"
          value={stats.bmi || "--"}
          unit=""
          status={
            stats.bmi
              ? stats.bmi >= 18.5 && stats.bmi <= 24.9
                ? "Normal"
                : "Review"
              : "Pending"
          }
          color="bg-purple-50 text-purple-600"
        />
        <HealthCard
          icon={ThumbsUp}
          title="Health Score"
          value={stats.healthScore}
          unit="%"
          status={stats.status.score}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Log Daily Intake"
          description="Please enter your food today to track your nutrition."
          linkText="Log Food"
          to="/dashboard/inputs"
          icon={ClipboardList}
          color="bg-indigo-50 text-indigo-600"
        />
        <QuickActionCard
          title="Your Diet Plan"
          description="View your personalized AI-generated diet plan."
          linkText="View Diet"
          to="/dashboard/diet"
          icon={Apple}
          color="bg-green-50 text-green-600"
        />
        <QuickActionCard
          title="Your Workout Plan"
          description="Check your recommended exercises for today."
          linkText="View Workout"
          to="/dashboard/workout"
          icon={Dumbbell}
          color="bg-purple-50 text-purple-600"
        />
      </div>
    </div>
  );
}
