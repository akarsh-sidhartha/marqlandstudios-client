import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ClientPortalView from './pages/ClientPortalView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<HomePage />} />

        {/* Client portal links */}
        <Route path="/p/:slug" element={<ClientPortalView />} />
      </Routes>
    </Router>
  );
}

export default App;