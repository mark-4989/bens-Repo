import React from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Add from "./pages/Add";
import List from "./pages/List";
import AdminOrders from "./pages/AdminOrders";
import { Navigate } from "react-router-dom";
import { Route, Routes } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import ProtectedAdminPanel from "./ProtectedAdminPanel";
import AdminLogin from "./pages/AdminLogin";
import { ToastContainer } from 'react-toastify';


export const backendUrl = import.meta.env.VITE_BACKEND_URL
console.log("Backend URL:", backendUrl);


const App = () => {
  return (
    <div>
      <SignedIn>
        <ToastContainer position="top-right" autoClose={3000} />
        <Navbar />
        <hr />
        <Sidebar />

        <Routes>
          <Route path="/" element={<Navigate to="/list" />} />
          <Route path="/add" element={<Add />} />
          <Route path="/list" element={<List />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/admin" element={<ProtectedAdminPanel />} />
          <Route path="/login" element={<AdminLogin />} />
        </Routes>
      </SignedIn>
      <SignedOut>
        <Routes>
          <Route path="*" element={<AdminLogin />} />
        </Routes>
      </SignedOut>
    </div>
  );
};

export default App;
