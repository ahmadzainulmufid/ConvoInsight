import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // simple error state (opsional tapi membantu UX)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErr: typeof errors = {};
    if (!email) nextErr.email = "Email is required.";
    if (!password) nextErr.password = "Password is required.";
    setErrors(nextErr);

    if (Object.keys(nextErr).length > 0) return;

    // langsung redirect ke dashboard tanpa validasi server
    navigate("/home");
  };

  return (
    <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-xl border border-gray-100 p-8">
      <header className="mb-6 text-center">
        <h2 className="text-gray-900 text-3xl font-bold">Welcome Back!</h2>
        <p className="text-gray-600 mt-1">Sign in to your account</p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div>
          <label className="text-sm text-gray-700 block mb-1" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-lg border pl-10 pr-3 py-2.5 text-gray-900 placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.email ? "border-red-400" : "border-gray-300"}`}
              placeholder="Input your email address"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            className="text-sm text-gray-700 block mb-1"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-lg border pl-10 pr-10 py-2.5 text-gray-900 placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.password ? "border-red-400" : "border-gray-300"}`}
              placeholder="Input your password"
              autoComplete="current-password"
            />

            {/* Toggle show/hide password (posisi dibenarkan) */}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/3 -translate-y-1/3 w-8 h-8 grid place-items-center text-gray-500"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {" "}
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}{" "}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-gray-700 text-sm select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300 accent-indigo-600 focus:ring-2 focus:ring-indigo-500"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>

          <a
            href="#"
            className="text-indigo-600 text-sm font-medium hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition rounded-lg text-white py-2.5 font-semibold shadow"
        >
          Sign in
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
