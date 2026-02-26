import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword)
      return alert("Passwords don't match!");

    try {
      await axiosClient.post("/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      alert("Signup successful! Please login.");
      navigate("/login");
    } catch (error) {
      console.error("Signup failed", error);
      if (error.response && error.response.status === 422) {
        alert(error.response.data.detail[0].msg);
      } else {
        alert(
          error.response?.data?.detail || "Signup failed. Please try again.",
        );
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900">
      {/* Left Side - Image/Brand */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-primary-900/40 flex flex-col justify-center items-center text-white p-12 text-center">
          <h1 className="text-5xl font-bold mb-6">Join the Movement</h1>
          <p className="text-xl max-w-md">
            Start your journey towards a healthier, happier you today.
          </p>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Create Account
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Sign up to get started with Nutrivitals AI.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:bg-slate-700 dark:text-white"
                  type="text"
                  placeholder="John Doe"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:bg-slate-700 dark:text-white"
                  type="email"
                  placeholder="name@example.com"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:bg-slate-700 dark:text-white"
                  type="password"
                  placeholder="••••••••"
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:bg-slate-700 dark:text-white"
                  type="password"
                  placeholder="••••••••"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <button
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] mt-2"
              type="submit"
            >
              Register <ArrowRight size={20} />
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary-600 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
