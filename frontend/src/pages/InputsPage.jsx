import { motion } from "framer-motion";
import { ArrowRight, Cloud, Coffee, GlassWater, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

const InputCard = ({
  icon: Icon,
  title,
  placeholder,
  delay,
  value,
  onChange,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
        <Icon size={24} />
      </div>
      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
        {title}
      </h3>
    </div>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 dark:text-white"
    />
  </motion.div>
);

export default function InputsPage() {
  const [meals, setMeals] = useState({
    breakfast: "",
    lunch: "",
    snacks: "",
    dinner: "",
    water: 2.5,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    setLoading(true);
    const payload = {
      ...meals,
      heartRate: 72, // Mock hardware vitals
      bloodPressure: "120/80",
      steps: 4500,
    };

    try {
      const res = await axiosClient.post("/analyze-nutrition", payload);
      localStorage.setItem("dietPlan", JSON.stringify(res.data.plan));
      navigate("/dashboard/diet");
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("AI analysis failed. Please check your connection or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Daily Nutrition Log
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Track your meals to get personalized AI insights.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        <InputCard
          icon={Coffee}
          title="Breakfast"
          placeholder="e.g., Idli, Sambar"
          delay={0.1}
          value={meals.breakfast}
          onChange={(val) => setMeals({ ...meals, breakfast: val })}
        />
        <InputCard
          icon={Sun}
          title="Lunch"
          placeholder="e.g., Rice, Dal, Sabzi"
          delay={0.2}
          value={meals.lunch}
          onChange={(val) => setMeals({ ...meals, lunch: val })}
        />
        <InputCard
          icon={Cloud}
          title="Snacks"
          placeholder="e.g., Fruits, Tea"
          delay={0.3}
          value={meals.snacks}
          onChange={(val) => setMeals({ ...meals, snacks: val })}
        />
        <InputCard
          icon={Moon}
          title="Dinner"
          placeholder="e.g., Roti, Paneer"
          delay={0.4}
          value={meals.dinner}
          onChange={(val) => setMeals({ ...meals, dinner: val })}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <GlassWater size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-slate-800 dark:text-white mb-1">
              Water Intake ({meals.water}L)
            </h3>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={meals.water}
              onChange={(e) =>
                setMeals({ ...meals, water: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0L</span>
              <span>2.5L (Goal)</span>
              <span>5L</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-10 flex justify-center"
      >
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 disabled:bg-slate-400 disabled:shadow-none"
        >
          {loading ? "AI is Thinking..." : "Analyze Nutrition"}{" "}
          <ArrowRight size={20} />
        </button>
      </motion.div>
    </div>
  );
}
