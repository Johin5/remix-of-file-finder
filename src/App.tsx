import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';
import CategorySettings from './pages/CategorySettings';
import TransactionSettings from './pages/TransactionSettings';
import AccountSettings from './pages/AccountSettings';
import Accounts from './pages/Accounts';

const App: React.FC = () => {
  return (
    <FinanceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/accounts" element={<AccountSettings />} />
            <Route path="settings/categories/:type" element={<CategorySettings />} />
            <Route path="settings/transactions" element={<TransactionSettings />} />
          </Route>
        </Routes>
      </Router>
    </FinanceProvider>
  );
};

export default App;
