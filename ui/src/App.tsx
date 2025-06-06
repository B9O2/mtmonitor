import "./App.css"
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AppDataProvider } from './contexts/AppDataContext';
import Overview from './components/overview/Overview';
import Dashboard from './components/dashboard/Dashboard';

const App: React.FC = () => {
  return (
    <WebSocketProvider pingInterval={30000} maxReconnectAttempts={10}>
      <AppDataProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/dashboard/:coreName" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </AppDataProvider>
    </WebSocketProvider>
  );
};

export default App;