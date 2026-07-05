import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ClientPortalView from './pages/ClientPortalView';
import PartnerPage from './pages/partner/PartnerPage'; // NEW — Supplier Portal public entry point
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<HomePage />} />

        {/* Client portal links */}
        <Route path="/p/:slug" element={<ClientPortalView />} />

        {/* Partner registration + login → Supplier Portal */}
        <Route path="/partner" element={<PartnerPage />} />
      </Routes>
    </Router>
  );
}

export default App;