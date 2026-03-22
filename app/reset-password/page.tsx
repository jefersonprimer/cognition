"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

function getApiErrorMessage(error: unknown): string | null {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? null;
}

export default function ResetPasswordPage() {
  const t = useTranslations("ResetPasswordPage");
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setValidating(true);
      setError("");
      setSuccess(false);

      if (!token) {
        setTokenValid(false);
        setValidating(false);
        return;
      }

      try {
        await api.get("/users/validate-reset-token", { params: { token } });
        if (!cancelled) setTokenValid(true);
      } catch (err: unknown) {
        if (!cancelled) {
          setTokenValid(false);
          setError(getApiErrorMessage(err) || t("errors.invalidToken"));
        }
      } finally {
        if (!cancelled) setValidating(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (password.length < 6) {
      setLoading(false);
      setError(t("errors.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      setError(t("errors.passwordMismatch"));
      return;
    }

    try {
      await api.post("/users/reset-password", { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white p-6 dark:bg-zinc-800 md:bg-gray-50 md:dark:bg-zinc-900">
      <main className="flex flex-1 flex-col items-center px-4 py-6 md:py-10">
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="w-full space-y-6 md:bg-white p-6 md:dark:bg-zinc-800 md:max-w-md md:rounded-xl md:border md:border-gray-200 md:p-8 md:shadow-lg md:dark:border-zinc-700">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("title")}
            </h2>

            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                {t("success")}
              </div>
            )}

            {validating ? (
              <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                {t("validating")}
              </div>
            ) : tokenValid ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t("fields.passwordLabel")}
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                      placeholder={t("fields.passwordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t("fields.confirmPasswordLabel")}
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                      placeholder={t("fields.confirmPasswordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-zinc-800"
                >
                  {loading ? t("submitting") : t("submit")}
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-center text-sm text-gray-600 dark:text-gray-300">
                <div>{t("errors.invalidToken")}</div>
                <Link
                  href="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  {t("requestNewLink")}
                </Link>
              </div>
            )}

            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                {t("backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
