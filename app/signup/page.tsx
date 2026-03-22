"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const t = useTranslations("SignupPage");
  const tSettings = useTranslations("SettingsModal");
  const router = useRouter();
  const locale = useLocale();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/users/signup", { name, email, password });
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || t("errors.generic"));
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
          <div className="w-full space-y-10 p-6 md:max-w-106 md:space-y-8 md:p-8 md:dark:border-zinc-700">
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

            <form className="mt-8 space-y-8 md:space-y-6" onSubmit={handleSignup}>
              <div className="space-y-6 md:space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("fields.nameLabel")}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-zinc-600 dark:text-white"
                    placeholder={t("fields.namePlaceholder")}
                  />
                </div>
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
                  <div className="relative mt-1">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-zinc-600 dark:text-white"
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
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-md border border-transparent bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus:ring-offset-zinc-800"
                >
                  {loading ? t("submitting") : t("submit")}
                </button>
              </div>

              <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
                {t("subtitlePrefix")}{" "}
                <Link
                  href="/login"
                  className="font-medium text-blue-400 transition-colors hover:text-blue-500 hover:underline"
                >
                  {t("subtitleLink")}
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
