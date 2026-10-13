import React from "react";
import LoginForm from "../components/AuthComponents/LoginForm";
import AuthLayout from "../components/AuthComponents/AuthLayout";

const LoginPage: React.FC = () => {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;
