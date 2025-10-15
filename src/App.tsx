// App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import DatasetsPage from "./pages/DatasetsPage";
import CreateDatasetPage from "./pages/CreateDatasetPage";
import DatasetDetailPage from "./pages/DatasetDetailPage";
import DomainPage from "./pages/DomainPage";
import Layout from "./components/SupportComponents/Layout";
import { Toaster } from "react-hot-toast";
import ConnectPage from "./pages/ConnectPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AuthContext } from "./context/AuthContext";
import CreateDomainPage from "./pages/CreateDomainPage";
import DashboardPage from "./pages/DashboardPage";
import NewChatPage from "./pages/NewChatPage";
import DashboardSettingPage from "./pages/DashboardSettingPage";
import ManageSettingsPage from "./pages/ManageSettings";
import ConfigurationUserPage from "./pages/ConfigurationUserPage";
import DatasetEditPage from "./pages/DatasetEditPage";

function LegacyDatasetRedirect() {
  const { id } = useParams();
  const last = localStorage.getItem("last_section") || "Campaign";
  return <Navigate to={`/domain/${last}/datasets/${id}`} replace />;
}

const PublicRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const user = React.useContext(AuthContext);
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            style: {
              background: "#2A2B32",
              color: "#fff",
              border: "1px solid #3a3b42",
            },
          }}
        />
        <Routes>
          {/* Login: publik, tapi redirect kalau sudah login */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Register: publik */}
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Semua yang lain: protected */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<HomePage />} />
            <Route path="/domain" element={<DomainPage />} />
            <Route path="/domain/new" element={<CreateDomainPage />} />
            <Route path="/configuser" element={<ConfigurationUserPage />} />
            <Route path="/domain/:section">
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="dashboard/newchat" element={<NewChatPage />} />
              <Route
                path="dashboard/dashboardSetting"
                element={<DashboardSettingPage />}
              />
              <Route
                path="dashboard/dashboardSetting/manageSettings"
                element={<ManageSettingsPage />}
              />
              <Route path="datasets" element={<DatasetsPage userName={""} />} />
              <Route
                path="datasets/new"
                element={<CreateDatasetPage userName={""} />}
              />
              <Route
                path="datasets/:id"
                element={<DatasetDetailPage userName={""} />}
              />
              <Route
                path="datasets/:id/edit"
                element={<DatasetEditPage userName={""} />}
              />
              <Route path="datasets/connect" element={<ConnectPage />} />
              <Route path="configuration" element={<ConfigurationPage />} />
            </Route>

            {/* legacy redirect juga protected */}
            <Route path="/datasets/:id" element={<LegacyDatasetRedirect />} />

            <Route
              path="*"
              element={<div className="p-6 text-white">404 Not Found</div>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
