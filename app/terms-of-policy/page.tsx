"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsOfPolicy() {
  const t = useTranslations("TermsOfPolicy");

  const sections = [
    "acceptance",
    "accounts",
    "content",
    "conduct",
    "termination",
    "liability"
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#191919] text-black dark:text-[#ffffffcf] selection:bg-[#2383e2] selection:text-white transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-4 tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t("lastUpdated")}
          </p>
          <p className="text-lg leading-relaxed italic border-l-4 border-[#2383e2] pl-6 py-2">
            {t("introduction")}
          </p>
        </header>

        <main className="space-y-12">
          {sections.map((section) => (
            <section key={section} className="space-y-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {t(`sections.${section}.title`)}
              </h2>
              <p className="text-base leading-relaxed opacity-90">
                {t(`sections.${section}.content`)}
              </p>
            </section>
          ))}
        </main>

        <footer className="mt-20 pt-12 border-t border-gray-200 dark:border-[#ffffff14] text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Cognition (Nolio). Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}
