'use client';

import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Carousel from '@/components/Carousel';
import api from '@/lib/api';
import { Note } from '@/types/note';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';
import { useRouter } from 'next/navigation';
import {
  Menu,
  ChevronsRight,
  MoreHorizontal,
  ChevronRight,
  Home as HomeIcon,
  Clock,
  ArrowUpCircle,
  Sparkles,
  Check,
  FileText,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Home');
  const { session } = useAuth();
  const { isSidebarOpen, setIsSidebarOpen } = useLayout();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showStartPageSubmenu, setShowStartPageSubmenu] = useState(false);
  const [showWidgetsSubmenu, setShowWidgetsSubmenu] = useState(false);
  const [greeting, setGreeting] = useState('');
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    document.title = t('documentTitle');
  }, [t]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('greeting.morning'));
    else if (hour < 18) setGreeting(t('greeting.afternoon'));
    else setGreeting(t('greeting.evening'));
  }, [t]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
        setShowStartPageSubmenu(false);
        setShowWidgetsSubmenu(false);
      }
    }

    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    async function fetchNotes() {
      if (!session) return;

      try {
        // Assuming the endpoint is /notes and it returns the user's notes
        // We might need to pass the token in headers if not handled by interceptors/defaults
        // In AuthContext we set localStorage but maybe not axios defaults globally yet for every request?
        // Let's set the header explicitly here to be safe or rely on an interceptor if one exists.
        // The previous setup_database.sql suggests a 'notes' table.
        // The backend 'noteRouter' is at '/api/notes'.

        const response = await api.get('/notes', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        });
        setNotes(response.data);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#191919]">
        {isSidebarOpen && <Sidebar />}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header Skeleton */}
          <div className="h-12 flex items-center justify-between px-4 relative z-20">
            <div className="flex items-center gap-4">
              {!isSidebarOpen && <div className="w-8 h-8 rounded bg-gray-200 dark:bg-[#2f2f2f] animate-pulse" />}
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gray-200 dark:bg-[#2f2f2f] animate-pulse" />
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-[#2f2f2f] animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-gray-200 dark:bg-[#2f2f2f] animate-pulse" />
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-5xl mx-auto">
            <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-[#383836] dark:border-t-white/80 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#191919]">
      {/* Main Sidebar (when open) */}
      {isSidebarOpen && <Sidebar />}

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Bar */}
        <div className="h-12 flex items-center justify-between px-4  relative z-20">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">

            {/* Menu / Floating Sidebar Trigger */}
            {!isSidebarOpen && (
              <div
                className="relative group mr-1"
                onMouseEnter={() => {
                  if (window.innerWidth >= 768) {
                    setIsFloatingOpen(true);
                  }
                }}
                onMouseLeave={() => setIsFloatingOpen(false)}
              >
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] rounded transition-colors"
                >
                  <Menu size={20} className="md:group-hover:hidden text-gray-700 dark:text-[#f0efed]" />
                  <ChevronsRight size={20} className="hidden md:group-hover:block text-gray-700 dark:text-[#e6e5e3]" />
                </button>

                {/* Floating Sidebar */}
                {isFloatingOpen && (
                  <div className="absolute top-full left-0 mt-2 w-60 max-h-[80vh] overflow-visible rounded-lg border border-gray-200 bg-white shadow-xl dark:border-[#2f2f2f] dark:bg-[#202020] animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <Sidebar isFloating={true} />
                  </div>
                )}
              </div>
            )}

            <div className="md:hidden">
              <p className="text-[#f0efed] text-sm font-medium">{t('title')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`rounded p-1 text-gray-700 transition-colors hover:bg-gray-100 dark:text-[#e6e5e3] dark:hover:bg-[#2f2f2f] ${isMoreMenuOpen ? 'bg-gray-100 dark:bg-[#2f2f2f]' : ''}`}
            >
              <MoreHorizontal size={22} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute top-full right-3 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white py-1 text-sm text-gray-600 shadow-xl dark:border-[#3f3f3f] dark:bg-[#252525] dark:text-[#9b9b9b]">
                {/* Option 1: Change homepage */}
                <div
                  className="relative mx-1 flex cursor-pointer items-center justify-between rounded px-3 py-1.5 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white group"
                  onClick={() => {
                    setShowStartPageSubmenu(!showStartPageSubmenu);
                    setShowWidgetsSubmenu(false);
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileText size={16} />
                    {t('menu.changeStartPage')}
                  </span>
                  <ChevronRight size={14} />

                  {/* Submenu - Left side */}
                  {showStartPageSubmenu && (
                    <div className="absolute top-0 right-full z-50 mr-1 w-64 rounded-lg border border-gray-200 bg-white py-1 text-gray-600 shadow-xl dark:border-[#3f3f3f] dark:bg-[#252525] dark:text-[#9b9b9b]">
                      <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white">
                        <HomeIcon size={16} /> <span>{t('menu.startPageOptions.home')}</span>
                      </button>
                      <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white">
                        <Clock size={16} /> <span>{t('menu.startPageOptions.lastVisited')}</span>
                      </button>
                      <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white">
                        <ArrowUpCircle size={16} /> <span>{t('menu.startPageOptions.topSidebar')}</span>
                      </button>
                      <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white">
                        <Sparkles size={16} /> <span>{t('menu.startPageOptions.ai')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Option 2: Mostrar/ocultar widgets */}
                <div
                  className="relative mx-1 flex cursor-pointer items-center justify-between rounded px-3 py-1.5 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white group"
                  onClick={() => {
                    setShowWidgetsSubmenu(!showWidgetsSubmenu);
                    setShowStartPageSubmenu(false);
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Eye size={16} />
                    {t('menu.toggleWidgets')}
                  </span>
                  <ChevronRight size={14} />

                  {/* Submenu - Left side for Widgets */}
                  {showWidgetsSubmenu && (
                    <div className="absolute top-0 right-full z-50 mr-1 w-64 rounded-lg border border-gray-200 bg-white py-1 text-gray-600 shadow-xl dark:border-[#3f3f3f] dark:bg-[#252525] dark:text-[#9b9b9b]">
                      {[
                        t('widgets.greeting'),
                        t('widgets.upcomingEvents'),
                        t('widgets.myTasks'),
                        t('widgets.databaseViews'),
                        t('widgets.tips'),
                        t('widgets.featuredTemplates'),
                      ].map((widget) => (
                        <button key={widget} className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white">
                          <span>{widget}</span>
                          <Check size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 flex-col items-center w-full max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#f0efed] text-center">
              {greeting}
            </h1>
          </header>

          <div className="space-y-8">
            <Carousel title={t('sections.recentAccesses')} notes={notes} />
            {/* We can filter notes for different carousels if needed, e.g. Favorites */}
            {notes.some(n => n.is_favorite) && (
              <Carousel
                title={t('sections.favorites')}
                notes={notes.filter(n => n.is_favorite)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
