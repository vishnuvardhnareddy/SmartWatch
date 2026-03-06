import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy load heavy pages (only downloaded when user navigates to them)
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const InputsPage = lazy(() => import("./pages/InputsPage"));
const DietPage = lazy(() => import("./pages/DietPage"));
const WorkoutPage = lazy(() => import("./pages/WorkoutPage"));
const HealthInputPage = lazy(() => import("./pages/HealthInputPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));

// Simple auth guard — redirects to /login if not logged in
function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem("username");
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Loading spinner for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardHome />
              </Suspense>
            }
          />
          <Route
            path="inputs"
            element={
              <Suspense fallback={<PageLoader />}>
                <InputsPage />
              </Suspense>
            }
          />
          <Route
            path="diet"
            element={
              <Suspense fallback={<PageLoader />}>
                <DietPage />
              </Suspense>
            }
          />
          <Route
            path="workout"
            element={
              <Suspense fallback={<PageLoader />}>
                <WorkoutPage />
              </Suspense>
            }
          />
          <Route
            path="health"
            element={
              <Suspense fallback={<PageLoader />}>
                <HealthInputPage />
              </Suspense>
            }
          />
          <Route
            path="report"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
