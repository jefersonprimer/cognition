"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const tSettings = useTranslations("SettingsModal");
  const { signIn } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const languageOptions = [
    { value: "pt-BR", label: tSettings("languageOptions.ptBR") },
    { value: "en", label: tSettings("languageOptions.en") },
  ];

  const selectedLanguageLabel =
    languageOptions.find((option) => option.value === locale)?.label ||
    tSettings("languageOptions.en");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/users/login", { email, password });
      signIn(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t("errors.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleLocaleChange = (nextLocale: string) => {
    if (nextLocale === locale) {
      setLanguageMenuOpen(false);
      return;
    }

    document.cookie = `locale=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`;
    setLanguageMenuOpen(false);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-white p-6 dark:bg-[#151718]">
      <main className="flex flex-1 flex-col items-center px-4 py-6 md:py-10">
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="w-full space-y-8 md:max-w-md md:p-8">
          <div className="flex items-center justify-center gap-2 text-center">
            
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("title")}
            </h2>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fields.emailLabel")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-zinc-600 dark:text-white"
                  placeholder={t("fields.emailPlaceholder")}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fields.passwordLabel")}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-zinc-600 dark:text-white"
                  placeholder={t("fields.passwordPlaceholder")}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-zinc-800"
              >
                {loading ? t("submitting") : t("submit")}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button className="text-sm">
                <Link href="/forgot-password" className="font-medium uppercase text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  {t("forgotPassword")}
                </Link>
              </button>
              <button className="text-sm text-gray-600 dark:text-gray-400">
                <Link
                  href="/signup"
                  className="font-medium uppercase text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
                >
                  {t("subtitleLink")}
                </Link>
              </button>
            </div>

            <div className="text-center text-sm">
              Ao continuar, você confirma que entende e aceita os{" "}
              <Link href="/terms-of-policy" className="underline">
                Termos e Condições
              </Link>{" "}
              e a{" "}
              <Link href="/privacy-policy" className="underline">
                Política de Privacidade
              </Link>
            </div>
          </form>
          </div>
        </div>

        <div className="w-full py-3 md:max-w-md">
          <div className="mx-auto flex w-full md:max-w-5xl items-center justify-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {selectedLanguageLabel}
                <ChevronDown size={14} className="text-gray-500 dark:text-zinc-400" />
              </button>

              {languageMenuOpen && (
                <div className="absolute bottom-full right-0 z-20 mb-2 min-w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleLocaleChange(option.value)}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
