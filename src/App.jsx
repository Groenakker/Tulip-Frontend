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
import ActivityLog from "./pages/ActivityLog/ActivityLog";
import Unauthorized from "./pages/Unauthorized";
import DocumentList from "./pages/DocumentManagement/DocumentList";
import DocumentDetails from "./pages/DocumentManagement/DocumentDetails";
import DocumentCreate from "./pages/DocumentManagement/DocumentCreate";
import StakeholderApproval from "./pages/StakeholderApproval/StakeholderApproval";
import OTPVerification from "./pages/StakeholderApproval/OTPVerification";
import ComingSoon from "./pages/ComingSoon/ComingSoon";
// Project Management - My Workspace pages.
import MyTasks from "./pages/MyWorkspace/MyTasks";
import MyCalendar from "./pages/MyWorkspace/MyCalendar";
import MyWorkload from "./pages/MyWorkspace/MyWorkload";
// Customer Portal
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import CustomerLayout from "./pages/CustomerPortal/Layout";
import CustomerLogin from "./pages/CustomerPortal/Login";
import CustomerDashboard from "./pages/CustomerPortal/Dashboard";
import CustomerProjects from "./pages/CustomerPortal/Projects";
import CustomerProjectDetail from "./pages/CustomerPortal/ProjectDetail";
import CustomerSamples from "./pages/CustomerPortal/Samples";
import CustomerSampleDetail from "./pages/CustomerPortal/SampleDetail";
import CustomerSampleNew from "./pages/CustomerPortal/SampleNew";
import CustomerDocuments from "./pages/CustomerPortal/Documents";
import PortalInviteSignup from "./pages/CustomerPortal/InviteSignup";
// Vendor Portal
import { VendorAuthProvider } from "./context/VendorAuthContext";
import VendorLayout from "./pages/VendorPortal/Layout";
import VendorLogin from "./pages/VendorPortal/Login";
import VendorDashboard from "./pages/VendorPortal/Dashboard";
import VendorOrders from "./pages/VendorPortal/Orders";
import VendorOrderDetail from "./pages/VendorPortal/OrderDetail";
// Internal Test Order pages (legacy; replaced by Lab Studies)
import TestOrderList from "./pages/Testing/OrderList";
import TestOrderDetail from "./pages/Testing/OrderDetail";
// Lab Studies — per-test assignment of instances + vendor.
import LabStudiesList from "./pages/LabStudies/LabStudiesList";
import LabStudyDetail from "./pages/LabStudies/LabStudyDetail";
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
  // Customer / Vendor portals own their full chrome (own sidebar, own
  // auth context) so we hide the internal sidebar + main wrapper
  // whenever the URL is inside one of those portals.
  const isPortalPage = location.pathname.startsWith('/portal') || location.pathname.startsWith('/vendor');
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
      {!isApprovalPage && !isPortalPage && isAuthenticated && <Sidebar />}
      <main className={!isApprovalPage && !isPortalPage && isAuthenticated ? "mainContentArea" : ""}>
        <Routes>
          {/* ---------------- Customer Portal ---------------- */}
          <Route path="/portal/login" element={
            <CustomerAuthProvider><CustomerLogin /></CustomerAuthProvider>
          } />
          <Route path="/portal/invite-signup" element={<PortalInviteSignup kind="customer" />} />
          <Route path="/portal" element={
            <CustomerAuthProvider><CustomerLayout /></CustomerAuthProvider>
          }>
            <Route index element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="projects" element={<CustomerProjects />} />
            <Route path="projects/:id" element={<CustomerProjectDetail />} />
            <Route path="samples" element={<CustomerSamples />} />
            <Route path="samples/new" element={<CustomerSampleNew />} />
            <Route path="samples/:id" element={<CustomerSampleDetail />} />
            <Route path="documents" element={<CustomerDocuments />} />
          </Route>

          {/* ---------------- Vendor Portal ---------------- */}
          <Route path="/vendor/login" element={
            <VendorAuthProvider><VendorLogin /></VendorAuthProvider>
          } />
          <Route path="/vendor/invite-signup" element={<PortalInviteSignup kind="vendor" />} />
          <Route path="/vendor" element={
            <VendorAuthProvider><VendorLayout /></VendorAuthProvider>
          }>
            <Route index element={<Navigate to="/vendor/dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="orders" element={<VendorOrders />} />
            <Route path="orders/:id" element={<VendorOrderDetail />} />
          </Route>

          {/* ---------------- Internal Test Orders ---------------- */}
          <Route path="/Testing/Orders" element={
            <ProtectedRoute module="Testing"><TestOrderList /></ProtectedRoute>
          } />
          <Route path="/Testing/Orders/:id" element={
            <ProtectedRoute module="Testing"><TestOrderDetail /></ProtectedRoute>
          } />
          <Route path="/Testing/Orders/add" element={
            <ProtectedRoute module="Testing"><TestOrderDetail /></ProtectedRoute>
          } />

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
          {/* Project Management - My Workspace.
              These pages aren't behind the per-module
              permission gate because they only ever show the
              CURRENT user's own assignments. Any authenticated
              user can view them. */}
          <Route path="/MyWorkspace/Tasks"    element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
          <Route path="/MyWorkspace/Calendar" element={<ProtectedRoute><MyCalendar /></ProtectedRoute>} />
          <Route path="/MyWorkspace/Workload" element={<ProtectedRoute><MyWorkload /></ProtectedRoute>} />

          {/* Coming Soon pages */}
          <Route path="/Dashboard" element={<ProtectedRoute module="Dashboard"><ComingSoon /></ProtectedRoute>} />
          <Route path="/MaterialResearch" element={<ProtectedRoute module="Material Research"><ComingSoon /></ProtectedRoute>} />
          <Route path="/ConstituentResearch" element={<ProtectedRoute module="Constituent Research"><ComingSoon /></ProtectedRoute>} />
          <Route path="/Library" element={<ProtectedRoute module="Library"><ComingSoon /></ProtectedRoute>} />
          <Route path="/CreateSample" element={<ProtectedRoute module="Create Sample"><ComingSoon /></ProtectedRoute>} />
          {/* Lab Studies — per-test assignment of sample instances + vendor.
              Replaces the legacy Test Orders flow as the canonical place
              to track which vendor is performing which test on which
              instances. */}
          <Route path="/LabStudies" element={
            <ProtectedRoute module="Lab Studies"><LabStudiesList /></ProtectedRoute>
          } />
          <Route path="/LabStudies/:id" element={
            <ProtectedRoute module="Lab Studies"><LabStudyDetail /></ProtectedRoute>
          } />
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
            path="/ActivityLog"
            element={
              <ProtectedRoute module="Settings">
                <ActivityLog />
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
