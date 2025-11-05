import { SignIn } from "@clerk/clerk-react";

const AdminLogin = () => (
  <div style={{ margin: "2rem auto", maxWidth: 400 }}>
    <SignIn />
  </div>
);

export default AdminLogin;