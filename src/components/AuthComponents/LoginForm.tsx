// components/LoginComponents/LoginForm.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithPopup,
} from "firebase/auth";
import { auth, db, googleProvider } from "../../utils/firebaseSetup";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { doc, getDoc, setDoc } from "firebase/firestore";

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const savedRemember = localStorage.getItem("rememberMe");

    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
    if (savedRemember === "true") setRemember(true);
  }, []);

  const mapFirebaseError = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Email atau password salah.";
      case "auth/user-not-found":
        return "Akun tidak ditemukan.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Coba lagi nanti.";
      case "auth/invalid-email":
        return "Format email tidak valid.";
      default:
        return "Gagal masuk. Coba lagi.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErr: typeof errors = {};
    if (!email) nextErr.email = "Email is required.";
    if (!password) nextErr.password = "Password is required.";
    setErrors(nextErr);
    if (Object.keys(nextErr).length > 0) return;

    setLoading(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    setResetSent(null);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      toast.success(`Signed in as ${auth.currentUser?.email ?? email}`);

      if (remember) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      const user = auth.currentUser;
      if (user) {
        const uid = user.uid;

        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || "",
            hasSeenOnboarding: false,
            createdAt: new Date(),
          });
        }

        // 🧹 Hapus cache chat dari user lain
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("chat_history_") && !key.includes(uid)) {
            localStorage.removeItem(key);
          }
        }

        // 🧹 Hapus dashboard lama milik user lain
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("dashboard_items_") && !key.includes(uid)) {
            localStorage.removeItem(key);
          }
        }
      }
      navigate("/home");
    } catch (err: unknown) {
      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : "";
      const msg = mapFirebaseError(errorCode || "");
      setErrors((prev) => ({ ...prev, form: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || "",
          hasSeenOnboarding: false,
          createdAt: new Date(),
        });
      }
      toast.success(`Welcome ${res.user.displayName || res.user.email}`);
      navigate("/home");
    } catch (err) {
      console.error("Google sign-in error:", err);
      setErrors((prev) => ({ ...prev, form: "Gagal login dengan Google." }));
    }
  };

  return (
    <div className="w-full max-w-md bg-[#151923]/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/40 border border-white/10 p-8 sm:p-10 animate-fade-in">
      <header className="mb-8 text-center">
        <h2 className="text-white text-3xl font-semibold tracking-tight">Welcome Back!</h2>
        <p className="text-gray-400 mt-2">Sign in to your account</p>
      </header>

      {errors.form && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-3.5 py-2.5 text-sm">
          {errors.form}
        </div>
      )}
      {resetSent && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3.5 py-2.5 text-sm">
          {resetSent}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-1.5" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-3 py-3 bg-[#0d1017] text-gray-100 placeholder:text-gray-500 transition focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15
                ${errors.email ? "border-rose-500/70" : "border-white/10"}`}
              placeholder="Input your email address"
              autoComplete="email"
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
              placeholder="Input your password"
              autoComplete="current-password"
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

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-gray-400 text-sm select-none cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-lg border-white/20 accent-indigo-500 focus:ring-2 focus:ring-indigo-500"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
            />
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all rounded-xl text-white py-3 font-semibold shadow-lg shadow-indigo-600/25"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don’t have an account?{" "}
        <Link
          to="/register"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>

      {/* Divider OR */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-xs uppercase tracking-wider text-gray-500">or</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full bg-white/5 text-gray-100 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl py-3 font-medium transition flex items-center justify-center gap-2.5 disabled:opacity-60"
      >
        <FcGoogle size={20} />
        Continue with Google
      </button>
    </div>
  );
};

export default LoginForm;
