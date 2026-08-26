import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';

// Core Application Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { PendingOrdersPage } from './pages/PendingOrdersPage';
import { PackingQueuePage } from './pages/PackingQueuePage';
import { ReadyOrdersPage } from './pages/ReadyOrdersPage';
import { DispatchedOrdersPage } from './pages/DispatchedOrdersPage';
import { DeliveredOrdersPage } from './pages/DeliveredOrdersPage';
import { CancelledOrdersPage } from './pages/CancelledOrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { DispatchBoardPage } from './pages/DispatchBoardPage';
import { DeliveryPartnersPage } from './pages/DeliveryPartnersPage';
import { ProductsStockPage } from './pages/ProductsStockPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Auth Screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Operations Portal */}
            {/* 1. Dashboard */}
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

            {/* 2. All Orders Master Registry */}
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

            {/* 3. Stage 1: Pending Review */}
            <Route
              path="/pending"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <PendingOrdersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/pending"
              element={<Navigate to="/pending" replace />}
            />

            {/* 4. Stage 2: Packing Queue */}
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
              path="/orders/packing"
              element={<Navigate to="/packing" replace />}
            />

            {/* 5. Stage 3: Ready for Rider */}
            <Route
              path="/ready"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <ReadyOrdersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/ready"
              element={<Navigate to="/ready" replace />}
            />
            <Route
              path="/orders/packed"
              element={<Navigate to="/ready" replace />}
            />

            {/* 6. Stage 4: Out for Delivery / Dispatched */}
            <Route
              path="/dispatched"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DispatchedOrdersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/dispatched"
              element={<Navigate to="/dispatched" replace />}
            />
            <Route
              path="/orders/shipped"
              element={<Navigate to="/dispatched" replace />}
            />

            {/* 7. Stage 5: Delivered Orders */}
            <Route
              path="/delivered"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <DeliveredOrdersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/delivered"
              element={<Navigate to="/delivered" replace />}
            />

            {/* 8. Cancelled Orders */}
            <Route
              path="/cancelled"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CancelledOrdersPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/cancelled"
              element={<Navigate to="/cancelled" replace />}
            />

            {/* 9. Dispatch Board */}
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

            {/* 10. Delivery Partners / Fleet */}
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

            {/* 11. Order Detail View */}
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

            {/* 12. Products & Stock */}
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
