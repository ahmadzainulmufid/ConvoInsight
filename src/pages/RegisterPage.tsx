import React from "react";
import RegisterForm from "../components/RegisterComponents/RegisterForm";

const LoginPage: React.FC = () => {
  return (
    <main
      className="min-h-screen w-screen grid place-items-center overflow-x-hidden px-4"
      // background bisa disesuaikan—pakai gradient lembut
      style={{
        background:
          "linear-gradient(180deg, rgba(241,245,249,1) 0%, rgba(255,255,255,1) 100%)",
      }}
    >
      <RegisterForm />
    </main>
  );
};

export default LoginPage;
