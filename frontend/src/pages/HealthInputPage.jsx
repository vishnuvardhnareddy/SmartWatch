import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle,
  Clock,
  Footprints,
  Heart,
  Save,
  Thermometer,
} from "lucide-react";
import { useState } from "react";
import axiosClient from "../api/axiosClient";

const InputField = ({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  unit,
}) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Icon size={18} />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
      />
      {unit && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-sm">
          {unit}
        </div>
      )}
    </div>
  </div>
);

export default function HealthInputPage() {
  const [formData, setFormData] = useState({
    bp: "",
    sugar: "",
    weight: "",
    height: "",
    steps: "",
    workoutTime: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const email = localStorage.getItem("email") || "demo-user";

      const payload = {
        email: email,
        bp: formData.bp,
        sugar: formData.sugar ? parseInt(formData.sugar) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        steps: formData.steps ? parseInt(formData.steps) : 0,
        workoutTime: formData.workoutTime ? parseInt(formData.workoutTime) : 0,
      };

      if (formData.height) {
        payload.height = parseFloat(formData.height);
      }

      await axiosClient.post("/save-health-inputs", payload);

      setStatus({
        type: "success",
        message: "Health data saved successfully!",
      });

      // Clear inputs after 2 seconds
      setTimeout(() => {
        setStatus({ type: "", message: "" });
        setFormData({
          bp: "",
          sugar: "",
          weight: "",
          height: "",
          steps: "",
          workoutTime: "",
        });
      }, 2000);
    } catch (error) {
      console.error("Save failed:", error);
      setStatus({
        type: "error",
        message: "Failed to save health data. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl max-w-2xl mx-auto space-y-8 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Health Log
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Track your vital signs and physical activity.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {/* Vitals Column */}
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <Heart className="text-rose-500" size={20} /> Vitals
            </h3>
            <InputField
              icon={Activity}
              label="Blood Pressure"
              type="text"
              placeholder="e.g., 120/80"
              unit="mmHg"
              value={formData.bp}
              onChange={(e) => handleChange(e, "bp")}
            />
            <InputField
              icon={Thermometer}
              label="Blood Sugar (Optional)"
              type="number"
              placeholder="e.g., 95"
              unit="mg/dL"
              value={formData.sugar}
              onChange={(e) => handleChange(e, "sugar")}
            />
            <InputField
              icon={Activity}
              label="Height (Updates Base Profile)"
              type="number"
              placeholder="e.g., 175"
              unit="cm"
              value={formData.height}
              onChange={(e) => handleChange(e, "height")}
            />
            <InputField
              icon={Save}
              label="Weight (Optional)"
              type="number"
              placeholder="e.g., 70"
              unit="kg"
              value={formData.weight}
              onChange={(e) => handleChange(e, "weight")}
            />
          </div>

          {/* Activity Column */}
          <div className="mt-8 md:mt-0">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <Footprints className="text-orange-500" size={20} /> Activity
            </h3>
            <InputField
              icon={Footprints}
              label="Daily Steps"
              type="number"
              placeholder="e.g., 8500"
              unit="steps"
              value={formData.steps}
              onChange={(e) => handleChange(e, "steps")}
            />
            <InputField
              icon={Clock}
              label="Workout Duration"
              type="number"
              placeholder="e.g., 45"
              unit="mins"
              value={formData.workoutTime}
              onChange={(e) => handleChange(e, "workoutTime")}
            />
          </div>
        </div>

        {status.message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-6 p-4 rounded-xl flex items-center justify-center gap-2 ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {status.type === "success" && <CheckCircle size={20} />}
            <span className="font-medium">{status.message}</span>
          </motion.div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                Save Daily Log
              </>
            )}
          </button>
          <p className="text-center text-slate-400 text-sm mt-4">
            Data will directly impact your Nutrivitals Health Score.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
