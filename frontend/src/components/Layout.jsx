import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}