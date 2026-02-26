import { motion } from "framer-motion";
import { Award, Utensils } from "lucide-react";
import { useEffect, useState } from "react";

// --- Sub-component: MealCard ---
const MealCard = ({ title, calories, items, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all"
  >
    <div className={`p-3 rounded-xl w-fit mb-4 ${color}`}>
      <Utensils size={20} />
    </div>
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
        {title}
      </h3>
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {calories} kcal
      </span>
    </div>
    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
      {items &&
        items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            {item}
          </li>
        ))}
    </ul>
  </motion.div>
);

export default function DietPage() {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    // LocalStorage nundi data teeskune mundu safety checks
    const savedPlan = localStorage.getItem("dietPlan");

    if (savedPlan && savedPlan !== "undefined" && savedPlan !== "null") {
      try {
        const parsedData = JSON.parse(savedPlan);
        // Backend 'plan' key lo data pampisthe, ledha direct object ayithe check
        setPlan(parsedData.plan ? parsedData.plan : parsedData);
      } catch (e) {
        console.error("Failed to parse diet plan:", e);
      }
    }
  }, []);

  // AI data lenappudu kanipinche Default Indian Diet Plan
  const displayPlan = plan || {
    breakfast: {
      items: ["Poha with Peanuts", "2 Boiled Eggs", "Masala Chai (No Sugar)"],
      calories: 350,
    },
    lunch: {
      items: ["2 Phulka", "Dal Tadka", "Palak Paneer", "Curd"],
      calories: 550,
    },
    dinner: {
      items: ["Moong Dal Khichdi", "Mixed Veg Sabzi", "Cucumber Salad"],
      calories: 400,
    },
    tip: "Drink at least 3 liters of water today to stay hydrated during your Batch-06 demo!",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-0">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-left"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Your Personalized Indian Diet Plan
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          AI-generated meal recommendations based on your heart rate, steps, and
          goals.
        </p>
      </motion.div>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MealCard
          title="Breakfast"
          calories={displayPlan.breakfast?.calories || 0}
          items={displayPlan.breakfast?.items || []}
          color="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
          delay={0.1}
        />
        <MealCard
          title="Lunch"
          calories={displayPlan.lunch?.calories || 0}
          items={displayPlan.lunch?.items || []}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
          delay={0.2}
        />
        <MealCard
          title="Dinner"
          calories={displayPlan.dinner?.calories || 0}
          items={displayPlan.dinner?.items || []}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          delay={0.3}
        />
      </div>

      {/* AI Nutrition Tip Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-4"
      >
        <div className="bg-indigo-100 dark:bg-indigo-800 p-3 rounded-full text-indigo-600 dark:text-indigo-300">
          <Award size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 mb-1">
            Nutrition Tip of the Day
          </h3>
          <p className="text-indigo-700 dark:text-indigo-300 text-sm leading-relaxed">
            {displayPlan.tip}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
