import { useUser, RedirectToSignIn } from "@clerk/clerk-react";
import List from "./pages/List"; // or your main admin panel component

const ProtectedAdminPanel = () => {
  const { isSignedIn, user } = useUser();

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Check Clerk public metadata for admin role
  if (user?.publicMetadata?.role !== "admin") {
    return <div>Access denied: Admins only.</div>;
  }

  return <List />; // or your admin dashboard component
};

export default ProtectedAdminPanel;