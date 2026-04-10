// import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar';
import './App.css';
import WhiteIsland from './components/Whiteisland.jsx';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { Toaster } from './components/Toaster';
// import Dashboard from './pages/Dashboard';
// import MaterialResearch from './pages/MaterialResearch';
// import ConstituentResearch from './pages/ConstituentResearch';
// import Library from './pages/Library';

import BPartner from './pages/ContractManagement/BusinessPartner/Bpartner';
import Pdetail from './pages/ContractManagement/BusinessPartner/Pdetail';
import Login from "./pages/LoginPage/LoginForm";
import SignUp from "./pages/SignupPage/SignupForm";
import InviteSignup from "./pages/InviteSignupPage/InviteSignup";
import Projects from "./pages/ContractManagement/Projects/ProjectList";
import ProjectDetails from "./pages/ContractManagement/Projects/ProjectDetails";
import TestCodes from "./pages/ContractManagement/TestCodes/TestCodesList";
import TestCodesDetails from "./pages/ContractManagement/TestCodes/TestCodesDetails";
import SSList from "./pages/ContractManagement/SampleSubmission/SSList";
import SSDetail from "./pages/ContractManagement/SampleSubmission/SSDetails";
import RecieveLog from "./pages/ContractManagement/RecieveLog/RecieveLog";
import RecieveDetails from "./pages/ContractManagement/RecieveLog/RecieveDetails";
import Instance from "./pages/ContractManagement/Instance/InstanceList";
import InstanceDetail from "./pages/ContractManagement/Instance/InstanceDetail";
import ShippingLog from "./pages/ContractManagement/ShippingLog/ShippingLog";
import ShippingDetails from "./pages/ContractManagement/ShippingLog/ShippingDetails";
import Warehouse from "./pages/Warehouse/Warehouse";
import WarehouseDetails from "./pages/Warehouse/WarehouseDetails";
import Settings from "./pages/SettingsPage/Settings";
import Unauthorized from "./pages/Unauthorized";
import DocumentList from "./pages/DocumentManagement/DocumentList";
import DocumentDetails from "./pages/DocumentManagement/DocumentDetails";
import DocumentCreate from "./pages/DocumentManagement/DocumentCreate";
import StakeholderApproval from "./pages/StakeholderApproval/StakeholderApproval";
import OTPVerification from "./pages/StakeholderApproval/OTPVerification";
import ComingSoon from "./pages/ComingSoon/ComingSoon";
// import Projects from './pages/Projects';
// import ShippingLog from './pages/ShippingLog';
// import RecieveLog from './pages/RecieveLog';
// import CreateSample from './pages/CreateSample';
// import SampleSub from './pages/SampleSub';
// import LabStudies from './pages/LabStudies';
// import Reports from './pages/Reports';
// import TestCodes from './pages/TestCodes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { isAuthenticated, hasPermission, permissionsLoading } = useAuth();
  const location = useLocation();
  const isApprovalPage = location.pathname.startsWith('/approval/') || location.pathname.startsWith('/verify-otp/');
  const defaultAuthedPath = React.useMemo(() => {
    if (permissionsLoading) {
      return "/BuisnessPartner";
    }

    const preferredRoutes = [
      { path: "/BuisnessPartner", module: "Business Partners" },
      { path: "/Projects", module: "Projects" },
      { path: "/TestCodes", module: "Test Codes" },
      { path: "/RecieveLog", module: "Receiving" },
      { path: "/ShippingLog", module: "Shipping" },
      { path: "/Warehouse", module: "Warehouse" },
      { path: "/DocumentManagement", module: "Document Management" },
      { path: "/Settings", module: "Settings" },
    ];

    const accessibleRoute = preferredRoutes.find((route) =>
      hasPermission(route.module, "read")
    );

    return accessibleRoute?.path || "/not-authorized";
  }, [permissionsLoading, hasPermission]);

  return (
    <>
      {!isApprovalPage && isAuthenticated && <Sidebar />}
      <main className={!isApprovalPage && isAuthenticated ? "mainContentArea" : ""}>
        <Routes>
          {/* OTP Verification - Public route (no authentication required) */}
          <Route
            path="/verify-otp/:token"
            element={<OTPVerification />}
          />

          {/* Stakeholder Approval - Public route (no authentication required, no layout) */}
          <Route
            path="/approval/:token"
            element={<StakeholderApproval />}
          />

          {/* Public Routes - Only accessible when not authenticated */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            } 
          />
          <Route
            path="/invite-signup"
            element={
              <PublicRoute>
                <InviteSignup />
              </PublicRoute>
            }
          />

          {/* Protected Routes - Only accessible when authenticated */}
          {/* Contract Management Submenu Items */}
          <Route 
            path="/BuisnessPartner" 
            element={
              <ProtectedRoute module="Business Partners">
                <BPartner />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/BuisnessPartner/PartnerDetails/:id"
            element={
              <ProtectedRoute module="Business Partners">
                <Pdetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/BuisnessPartner/PartnerDetails/add"
            element={
              <ProtectedRoute module="Business Partners">
                <Pdetail />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/Projects" 
            element={
              <ProtectedRoute module="Projects">
                <Projects />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/Projects/ProjectDetails/:id"
            element={
              <ProtectedRoute module="Projects">
                <ProjectDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Projects/ProjectDetails/add"
            element={
              <ProtectedRoute module="Projects">
                <ProjectDetails />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/TestCodes" 
            element={
              <ProtectedRoute module="Test Codes">
                <TestCodes />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/TestCodes/TestCodesDetails/:id"
            element={
              <ProtectedRoute module="Test Codes">
                <TestCodesDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/TestCodes/TestCodesDetails/add"
            element={
              <ProtectedRoute module="Test Codes">
                <TestCodesDetails />
              </ProtectedRoute>
            }
          />
          {/* Recieve Log */}
          <Route 
            path="/RecieveLog" 
            element={
              <ProtectedRoute module="Receiving">
                <RecieveLog />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/RecieveLog/RecieveDetails/:id" 
            element={
              <ProtectedRoute module="Receiving">
                <RecieveDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/RecieveLog/RecieveDetails/add" 
            element={
              <ProtectedRoute module="Receiving">
                <RecieveDetails />
              </ProtectedRoute>
            } 
          />
          {/* Sample Submission */}
          <Route 
            path="/SampleSubmission" 
            element={
              <ProtectedRoute module="Sample Submission">
                <SSList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/SampleSubmission/SSDetail/:id" 
            element={
              <ProtectedRoute module="Sample Submission">
                <SSDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/SampleSubmission/SSDetail/add" 
            element={
              <ProtectedRoute module="Sample Submission">
                <SSDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/Instance" 
            element={
              <ProtectedRoute module="Instances">
                <Instance />
              </ProtectedRoute>
            } 
          />
          {/* Instance Detail Route - handles navigation when clicking on an instance in the list */}
          <Route 
            path="/Instance/:id" 
            element={
              <ProtectedRoute module="Instances">
                <InstanceDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ShippingLog" 
            element={
              <ProtectedRoute module="Shipping">
                <ShippingLog />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ShippingLog/:id" 
            element={
              <ProtectedRoute>
                <ShippingDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ShippingLog/add" 
            element={
              <ProtectedRoute module="Shipping">
                <ShippingDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/Warehouse" 
            element={
              <ProtectedRoute module="Warehouse">
                <Warehouse />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/Warehouse/:warehouseId"
            element={
              <ProtectedRoute module="Warehouse">
                <WarehouseDetails />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/DocumentManagement" 
            element={
              <ProtectedRoute module="Document Management">
                <DocumentList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/DocumentManagement/DocumentDetails/:id" 
            element={
              <ProtectedRoute module="Document Management">
                <DocumentDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/DocumentManagement/DocumentDetails/add" 
            element={
              <ProtectedRoute module="Document Management">
                <DocumentCreate />
              </ProtectedRoute>
            } 
          />
          {/* Coming Soon pages */}
          <Route path="/Dashboard" element={<ProtectedRoute module="Dashboard"><ComingSoon /></ProtectedRoute>} />
          <Route path="/MaterialResearch" element={<ProtectedRoute module="Material Research"><ComingSoon /></ProtectedRoute>} />
          <Route path="/ConstituentResearch" element={<ProtectedRoute module="Constituent Research"><ComingSoon /></ProtectedRoute>} />
          <Route path="/Library" element={<ProtectedRoute module="Library"><ComingSoon /></ProtectedRoute>} />
          <Route path="/CreateSample" element={<ProtectedRoute module="Create Sample"><ComingSoon /></ProtectedRoute>} />
          <Route path="/LabStudies" element={<ProtectedRoute module="Lab Studies"><ComingSoon /></ProtectedRoute>} />
          <Route path="/Reports" element={<ProtectedRoute module="Reports"><ComingSoon /></ProtectedRoute>} />

          <Route 
            path="/Settings" 
            element={
              <ProtectedRoute module="Settings">
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/not-authorized" 
            element={
              <ProtectedRoute>
                <Unauthorized />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to={defaultAuthedPath} replace />
              </ProtectedRoute>
            } 
          />
          {/* Catch all - redirect to login if not authenticated, or home if authenticated */}
          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? defaultAuthedPath : "/login"} replace />} 
          />
        </Routes>
      </main>
      <Toaster />
    </>
  );
}

export default App
