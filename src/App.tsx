import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ProductsStockPage } from './pages/ProductsStockPage';
import { PackingQueuePage } from './pages/PackingQueuePage';
import { DispatchBoardPage } from './pages/DispatchBoardPage';
import { DeliveryPartnersPage } from './pages/DeliveryPartnersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Login Screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes inside Admin Operations Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DashboardPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrdersListPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/packing"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <PackingQueuePage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dispatch"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DispatchBoardPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/delivery-partners"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DeliveryPartnersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrderDetailPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ProductsStockPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
