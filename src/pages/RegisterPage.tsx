import React from "react";
import RegisterForm from "../components/AuthComponents/RegisterForm";
import AuthLayout from "../components/AuthComponents/AuthLayout";

const LoginPage: React.FC = () => {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
};

export default LoginPage;
