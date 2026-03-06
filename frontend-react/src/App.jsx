import { useState } from 'react';
import './index.css';
import Header from './components/Header';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import MonitorPage from './pages/MonitorPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import ConfigPage from './pages/ConfigPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('monitor');

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="bg-zinc-50 text-zinc-800 antialiased selection:bg-pink-500 selection:text-white min-h-screen">
          <Header activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'monitor' && <MonitorPage />}
          {activeTab === 'calendario' && <CalendarPage />}
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'config' && <ConfigPage />}
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
