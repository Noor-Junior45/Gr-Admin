import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { NewOrderAlertBanner } from './components/NewOrderAlertBanner';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col">
            {/* Global Realtime Alerts & Modals */}
            <NewOrderAlertBanner />
            <NotificationSettingsModal />

            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes with App Shell Header */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <OrdersListPage />
                    </>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <OrdersListPage />
                    </>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <OrderDetailPage />
                    </>
                  </ProtectedRoute>
                }
              />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
