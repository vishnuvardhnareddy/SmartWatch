import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import InputsPage from './pages/InputsPage';
import WorkoutPage from './pages/WorkoutPage';

import DashboardHome from './pages/DashboardHome';

import DietPage from './pages/DietPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={<Layout />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="inputs" element={<InputsPage />} />
                    <Route path="diet" element={<DietPage />} />
                    <Route path="workout" element={<WorkoutPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}