import { CheckCircle, FileText, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function ReportPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const email = localStorage.getItem("email") || "";

  const handleSendReport = async () => {
    if (!email) {
      setError("No email found. Please log in again.");
      return;
    }

    setSending(true);
    setError("");
    setSent(false);

    try {
      const res = await axiosClient.post("/send-report", { email });
      if (res.data.status === "success") {
        setSent(true);
      } else {
        setError(res.data.message || "Failed to send report.");
      }
    } catch (err) {
      console.error("Send report error:", err);
      setError("Failed to send report. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Daily Health Report
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Send a complete health summary to your email.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
        {/* Report Preview Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 mb-8 border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500 rounded-xl text-white">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Your Report Includes
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                AI-powered daily health analysis
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                emoji: "❤️",
                label: "Health Log",
                desc: "BP, Sugar, Weight, Steps, Water",
              },
              {
                emoji: "🍽️",
                label: "Food Intake",
                desc: "All meals + total calories",
              },
              {
                emoji: "🏋️",
                label: "Workout Summary",
                desc: "Exercises, duration, calories burned",
              },
              {
                emoji: "🤖",
                label: "AI Coach Summary",
                desc: "What to improve, what to avoid",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/60 dark:bg-slate-700/30 p-3 rounded-lg"
              >
                <span className="text-xl">{item.emoji}</span>
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-white">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Send To Info */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl mb-6">
          <Mail size={20} className="text-slate-400" />
          <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
            Report will be sent to your registered email
          </p>
        </div>

        {/* Status Messages */}
        {sent && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl mb-6">
            <CheckCircle size={20} />
            <span className="font-medium">
              Report sent successfully! Check your inbox 📬
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6">
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendReport}
          disabled={sending || !email}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
        >
          {sending ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              Generating & Sending Report...
            </>
          ) : sent ? (
            <>
              <Send size={22} />
              Send Again
            </>
          ) : (
            <>
              <Send size={22} />
              Send Report to My Email
            </>
          )}
        </button>

        <p className="text-center text-slate-400 text-sm mt-4">
          Powered by Nutrivitals AI
        </p>
      </div>
    </div>
  );
}
