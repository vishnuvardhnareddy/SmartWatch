import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosClient.post("/login", { email, password });
      if (response.data.status === "success") {
        localStorage.setItem("username", response.data.username);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed", error);
      if (error.response && error.response.status === 422) {
        alert(error.response.data.detail[0].msg);
      } else {
        alert(
          error.response?.data?.detail || "Login failed. Please try again.",
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
            "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-primary-900/40 flex flex-col justify-center items-center text-white p-12 text-center">
          <h1 className="text-5xl font-bold mb-6">Nutrivitals AI</h1>
          <p className="text-xl max-w-md">
            Your personal AI companion for a healthier, fitter lifestyle.
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
            Welcome Back
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Please enter your details to sign in.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              type="submit"
            >
              Sign In <ArrowRight size={20} />
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600 dark:text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary-600 font-semibold hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
