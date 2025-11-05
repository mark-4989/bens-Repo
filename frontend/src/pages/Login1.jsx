import React from 'react'
import { SignIn } from "@clerk/clerk-react";

const Login1 = () => {
  return (
    <div style={{ margin: "2rem auto", maxWidth: 400 }}>
    <SignIn />
  </div>
  )
}

export default Login1