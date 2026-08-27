import { Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import RequireAuth from "./components/RequireAuth";
import AppShell from "./components/layout/AppShell";

import Landing from "./pages/Landing";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import FlowerDetail from "./pages/FlowerDetail";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import GiftHistory from "./pages/GiftHistory";
import GiftPage from "./pages/GiftPage";
import Settings from "./pages/Settings";
import Pairing from "./pages/Pairing";
import PairingAccept from "./pages/PairingAccept";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

function Protected({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/gift/:token" element={<GiftPage />} />
      <Route path="/pair/:token" element={<PairingAccept />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/search" element={<Protected><Search /></Protected>} />
        <Route path="/flowers/:id" element={<Protected><FlowerDetail /></Protected>} />
        <Route path="/people" element={<Protected><People /></Protected>} />
        <Route path="/people/:id" element={<Protected><PersonDetail /></Protected>} />
        <Route path="/wishlist" element={<Protected><Wishlist /></Protected>} />
        <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/gift-history" element={<Protected><GiftHistory /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/pairing" element={<Protected><Pairing /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
