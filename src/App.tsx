// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import DatasetsPage from "./pages/DatasetsPage";
import CreateDatasetPage from "./pages/CreateDatasetPage";
import DatasetDetailPage from "./pages/DatasetDetailPage";
import DomainPage from "./pages/DomainPage";
import Layout from "./components/SupportComponents/Layout";
import { Toaster } from "react-hot-toast";
import ConnectPage from "./pages/ConnectPage";
import ConfigurationPage from "./pages/ConfigurationPage";

function LegacyDatasetRedirect() {
  const { id } = useParams();
  const last = localStorage.getItem("last_section") || "Campaign";
  return <Navigate to={`/domain/${last}/datasets/${id}`} replace />;
}

const App: React.FC = () => {
  const userName = "AAGM Ceria Banget";

  return (
    <Router>
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
        <Route path="/" element={<LoginPage />} />
        <Route element={<Layout userName={userName} />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/domain" element={<DomainPage />} />
          <Route path="/domain/:section">
            <Route
              path="datasets"
              element={<DatasetsPage userName={userName} />}
            />
            <Route
              path="datasets/new"
              element={<CreateDatasetPage userName={userName} />}
            />
            <Route
              path="datasets/:id"
              element={<DatasetDetailPage userName={userName} />}
            />
            <Route
              path="datasets/connect"
              element={<ConnectPage userName={userName} />}
            />
            <Route path="configuration" element={<ConfigurationPage />} />
          </Route>

          {/* redirect legacy /datasets/:id -> /domain/{last_section}/datasets/:id */}
          <Route path="/datasets/:id" element={<LegacyDatasetRedirect />} />

          <Route
            path="*"
            element={<div className="p-6 text-white">404 Not Found</div>}
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
