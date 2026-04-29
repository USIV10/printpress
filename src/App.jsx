import React, { useState } from 'react';
import { useAuth } from './utils/useData';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewJob from './pages/NewJob';
import AllJobs from './pages/AllJobs';
import SalesReport from './pages/SalesReport';
import MomoPayments from './pages/MomoPayments';
import UserManagement from './pages/UserManagement';
import PaperStock from './pages/PaperStock';
import EmailSettings from './pages/EmailSettings';
import styles from './App.module.css';

export default function App() {
  const { user, login, setLoggedIn, logout } = useAuth();
  const [page, setPage] = useState('dashboard');

  const handleLogin = async (username, password) => {
    const res = await login(username, password);
    if (res.success) setLoggedIn(res.user);
    return res;
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const PAGES = {
    dashboard: <Dashboard />,
    newjob:    <NewJob currentUser={user} />,
    alljobs:   <AllJobs currentUser={user} />,
    ...(user.role === 'admin' && {
      report: <SalesReport />,
      momo:   <MomoPayments />,
      stock:  <PaperStock />,
      email:  <EmailSettings />,
      users:  <UserManagement currentUser={user} />,
    }),
  };

  const safePage = PAGES[page] ? page : 'dashboard';

  return (
    <div className={styles.app}>
      <Sidebar current={safePage} onNavigate={setPage} user={user} onLogout={logout} />
      <main className={styles.main}>{PAGES[safePage]}</main>
    </div>
  );
}
