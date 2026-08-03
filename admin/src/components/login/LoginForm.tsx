"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function UserIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.1 4.1" />
      <path d="M6.1 6.1C3.9 7.7 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
    </svg>
  );
}

const inputClass =
  "peer h-[50px] w-full rounded-[12px] border border-[#d8e0ea] bg-[#f3f6f9] py-3 pr-11 pl-12 text-[13px] text-[#1e293b] outline-none transition-[background-color,box-shadow,border-color] placeholder:text-transparent focus:border-[#94a3b8] focus:bg-[#f8fafc] focus:shadow-[0_0_0_3px_rgba(30,58,138,0.08)]";

const labelClass =
  "pointer-events-none absolute top-1/2 left-12 z-10 w-auto max-w-max -translate-y-1/2 bg-transparent px-0 text-[13px] leading-none text-[#94a3b8] transition-all duration-150 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-white peer-focus:px-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-[#1e3a8a] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-[#1e3a8a]";

const iconInsideClass =
  "pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-[#64748b]";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: FieldErrors = {};
    const trimmed = email.trim();

    if (!trimmed) next.email = "Email is required.";
    else if (!isValidEmail(trimmed)) next.email = "Enter a valid email.";

    if (!password) next.password = "Password is required.";
    else if (password.length < 6) {
      next.password = "Use at least 6 characters.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed, password }),
      });

      const data = (await res.json().catch(() => null)) as {
        accessToken?: string;
        admin?: { email: string; role: string };
        error?: { message?: string };
      } | null;

      if (!res.ok || !data?.accessToken) {
        setErrors({
          form: data?.error?.message ?? "Sign in failed. Try again.",
        });
        return;
      }

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("ffops_access_token", data.accessToken);
      if (data.admin) {
        storage.setItem("ffops_admin", JSON.stringify(data.admin));
      }
      // clear the other store so remember toggle stays consistent
      (remember ? sessionStorage : localStorage).removeItem("ffops_access_token");
      (remember ? sessionStorage : localStorage).removeItem("ffops_admin");

      router.replace("/dashboard");
    } catch {
      setErrors({
        form: "Cannot reach authentication service. Is the API running?",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3.5">
      {errors.form ? (
        <div
          role="alert"
          className="rounded-[12px] bg-[#fef2f2] px-3.5 py-2.5 text-[12px] text-[#dc2626]"
        >
          {errors.form}
        </div>
      ) : null}

      <div className="space-y-1">
        <div className="relative mt-2">
          <span className={iconInsideClass}>
            <UserIcon />
          </span>
          <input
            id="ops-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            placeholder=" "
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  email: undefined,
                  form: undefined,
                }));
              }
            }}
            className={inputClass}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "ops-email-err" : undefined}
          />
          <label htmlFor="ops-email" className={labelClass}>
            User Name
          </label>
        </div>
        {errors.email ? (
          <p id="ops-email-err" className="pl-1 text-[12px] text-[#dc2626]">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="relative mt-2">
          <span className={iconInsideClass}>
            <LockIcon />
          </span>
          <input
            id="ops-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            placeholder=" "
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password || errors.form) {
                setErrors((prev) => ({
                  ...prev,
                  password: undefined,
                  form: undefined,
                }));
              }
            }}
            className={inputClass}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "ops-password-err" : undefined}
          />
          <label htmlFor="ops-password" className={labelClass}>
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-2.5 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#1e3a8a] transition-colors hover:bg-blue-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.password ? (
          <p id="ops-password-err" className="pl-1 text-[12px] text-[#dc2626]">
            {errors.password}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#1e3a8a]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#1e3a8a]"
          />
          Remember me
        </label>
        <button
          type="button"
          className="text-[12px] font-medium text-[#1e3a8a] hover:underline"
          onClick={() =>
            setErrors({
              form: "Password reset is not connected yet.",
            })
          }
        >
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex h-[46px] w-full items-center justify-center rounded-[12px] bg-[#1b3a8a] text-[14px] font-semibold text-white transition-colors hover:bg-[#152e6e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[#e2e8f0]" />
        <span className="text-[12px] text-[#a0aec0]">or</span>
        <div className="h-px flex-1 bg-[#e2e8f0]" />
      </div>

      <button
        type="button"
        className="flex h-[46px] w-full items-center justify-center rounded-[12px] border border-[#2d3748] bg-white text-[13px] font-medium text-[#2d3748] transition-colors hover:bg-[#f8fafc]"
        onClick={() =>
          setErrors({
            form: "Other sign-in methods are not connected yet.",
          })
        }
      >
        Sign in with other
      </button>

      <p className="pt-2 text-center text-[12px] text-[#718096]">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          className="font-semibold text-[#1e3a8a] hover:underline"
          onClick={() =>
            setErrors({
              form: "Sign up is invite-only. Ask a Super Admin.",
            })
          }
        >
          Sign Up
        </button>
      </p>
    </form>
  );
}
