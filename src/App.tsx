import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';

// Core Application Pages
import { LoginPage } from './pages/LoginPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { PendingOrdersPage } from './pages/PendingOrdersPage';
import { PackingQueuePage } from './pages/PackingQueuePage';
import { ReadyOrdersPage } from './pages/ReadyOrdersPage';
import { DispatchedOrdersPage } from './pages/DispatchedOrdersPage';
import { DeliveredOrdersPage } from './pages/DeliveredOrdersPage';
import { CancelledOrdersPage } from './pages/CancelledOrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { DispatchBoardPage } from './pages/DispatchBoardPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { DeliveryPartnersPage } from './pages/DeliveryPartnersPage';
import { ProductsStockPage } from './pages/ProductsStockPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { DeleteAccountPolicyPage } from './pages/DeleteAccountPolicyPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { useAndroidBackHandler } from './hooks/useAndroidBackHandler';

const AndroidBackManager: React.FC = () => {
  useAndroidBackHandler();
  return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <AndroidBackManager />
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Auth Screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Operations Portal */}
            {/* 1. Landing Page: Orders Queue */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrdersListPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* 2. Pending Orders Queue (Master) */}
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

            {/* Redirect legacy overview / dashboard routes to landing orders page */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />

            {/* 3. Stage 1: Pending Review (Merged into /orders) */}
            <Route
              path="/pending"
              element={<Navigate to="/orders" replace />}
            />
            <Route
              path="/orders/pending"
              element={<Navigate to="/orders" replace />}
            />

            {/* 4. Stage 2: Packing Queue */}
            <Route
              path="/packing"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrdersListPage defaultTab="packing" />
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
                    <OrdersListPage defaultTab="packed" />
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
              path="/dispatch"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrdersListPage defaultTab="dispatch" />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatched"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrdersListPage defaultTab="dispatch" />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/dispatch"
              element={<Navigate to="/dispatch" replace />}
            />
            <Route
              path="/orders/dispatched"
              element={<Navigate to="/dispatch" replace />}
            />
            <Route
              path="/orders/shipped"
              element={<Navigate to="/dispatch" replace />}
            />

            {/* 7. History: Delivered and Cancelled Orders */}
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrderHistoryPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/history"
              element={<Navigate to="/history" replace />}
            />
            <Route
              path="/delivered"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <OrderHistoryPage defaultTab="delivered" />
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
                    <OrderHistoryPage defaultTab="cancelled" />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/cancelled"
              element={<Navigate to="/cancelled" replace />}
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

            {/* 13. Operator Profile & Account (Matching reference image) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* 14. Settings (Sound, Popups, Operational Preferences) */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* 15. Privacy Policy (Public for Google Play Store compliance) */}
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />

            {/* 16. Terms of Service (Public for Google Play Store compliance) */}
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />

            {/* 17. Delete Account & User Data (Public for Google Play Store Data Safety compliance) */}
            <Route path="/delete-account-policy" element={<DeleteAccountPolicyPage />} />
            <Route path="/delete-account" element={<DeleteAccountPolicyPage />} />
            <Route path="/data-deletion" element={<DeleteAccountPolicyPage />} />

            {/* 18. Refund Policy (Public) */}
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/refund" element={<RefundPolicyPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
