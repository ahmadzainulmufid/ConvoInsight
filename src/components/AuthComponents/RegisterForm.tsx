// components/RegisterComponents/RegisterForm.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, db } from "../../utils/firebaseSetup";
import toast from "react-hot-toast";
import { doc, setDoc } from "firebase/firestore";

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const mapFirebaseError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "Email sudah digunakan.";
      case "auth/invalid-email":
        return "Format email tidak valid.";
      case "auth/weak-password":
        return "Password terlalu lemah (min 6 karakter).";
      default:
        return "Gagal membuat akun. Coba lagi.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErr: { [k: string]: string } = {};
    if (!fullName) nextErr.fullName = "Nama lengkap wajib diisi.";
    if (!email) nextErr.email = "Email wajib diisi.";
    if (!password) nextErr.password = "Password wajib diisi.";
    if (password && password.length < 6)
      nextErr.password = "Minimal 6 karakter.";
    if (confirm !== password)
      nextErr.confirm = "Konfirmasi password tidak sama.";
    setErrors(nextErr);
    if (Object.keys(nextErr).length > 0) return;

    setLoading(true);
    try {
      // 🔹 1. Buat akun di Firebase Auth
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCred.user;

      // 🔹 2. Update profil user (nama tampilannya)
      if (user) {
        await updateProfile(user, { displayName: fullName });

        // 🔹 3. Buat dokumen user di Firestore
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          email: user.email,
          displayName: fullName,
          hasSeenOnboarding: false, // 🚀 inilah flag penting untuk onboarding
          createdAt: new Date(),
        });
      }

      toast.success("Account created successfully!");
      navigate("/");
    } catch (err) {
      const error = err as FirebaseError;
      const msg = mapFirebaseError(error.code || "");
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#151923]/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/40 border border-white/10 p-8 sm:p-10 animate-fade-in">
      <header className="mb-8 text-center">
        <h2 className="text-white text-3xl font-semibold tracking-tight">
          Create your account
        </h2>
        <p className="text-gray-400 mt-2">
          Start analyzing your data with ConvoInsight!
        </p>
      </header>

      {errors.form && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-3.5 py-2.5 text-sm">
          {errors.form}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div>
          <label
            className="text-sm font-medium text-gray-300 block mb-1.5"
            htmlFor="fullname"
          >
            Full Name
          </label>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-3 py-3 bg-[#0d1017] text-gray-100 placeholder:text-gray-500 transition focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15
                ${errors.fullName ? "border-rose-500/70" : "border-white/10"}`}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>
          {errors.fullName && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-1.5" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-3 py-3 bg-[#0d1017] text-gray-100 placeholder:text-gray-500 transition focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15
                ${errors.email ? "border-rose-500/70" : "border-white/10"}`}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            className="text-sm font-medium text-gray-300 block mb-1.5"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-10 py-3 bg-[#0d1017] text-gray-100 placeholder:text-gray-500 transition focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15
                ${errors.password ? "border-rose-500/70" : "border-white/10"}`}
              placeholder="Enter your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-gray-500 hover:text-gray-200 transition-colors"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-1.5" htmlFor="confirm">
            Confirm Password
          </label>
          <div className="relative">
            <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-3 py-3 bg-[#0d1017] text-gray-100 placeholder:text-gray-500 transition focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15
                ${errors.confirm ? "border-rose-500/70" : "border-white/10"}`}
              placeholder="Re-enter your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-gray-500 hover:text-gray-200 transition-colors"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {errors.confirm && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.confirm}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all rounded-xl text-white py-3 font-semibold shadow-lg shadow-indigo-600/25"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link
          to="/"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterForm;
