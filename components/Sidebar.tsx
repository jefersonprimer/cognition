import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Search,
  Home,
  Users,
  Sparkle,
  Inbox,
  Plus,
  Mail,
  Calendar,
  Smartphone,
  Settings,
  HelpCircle,
  ChevronDown,
  SquarePen,
  Layers,
  Trash2,
  ChevronsLeft,
  History,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLayout } from "@/context/LayoutContext";
import { useFavorite } from "@/context/FavoriteContext";
import api from "@/lib/api";
import { Note } from "@/types/note";
import UserModal from "./UserModal";
import SidebarItem, { SidebarItemSkeleton } from "./SidebarItem";
import SearchModal from "./SearchModal";
import TrashModal from "./TrashModal";
import SettingsModal from "./SettingsModal";
import MoreOptionsModal from "./MoreOptionsModal";

export default function Sidebar({
  isFloating = false,
}: {
  isFloating?: boolean;
}) {
  const t = useTranslations("Sidebar");
  const { session } = useAuth();
  const { setIsSidebarOpen } = useLayout();
  const { favoriteNotes, isLoading: isLoadingFavorites } = useFavorite();
  const router = useRouter();
  const pathname = usePathname();
  const userName = session?.user?.name?.trim() || t("user.fallbackName");
  const [rootNotes, setRootNotes] = useState<Note[]>([]);
  const [loadingRootNotes, setLoadingRootNotes] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    favoritos: true,
    particular: true,
    compartilhado: true,
    aplicativos: true,
    configs: false,
  });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMoreOptionsModalOpen, setIsMoreOptionsModalOpen] = useState(false);
  const [userModalPos, setUserModalPos] = useState({ top: 0, left: 0 });
  const [moreOptionsModalPos, setMoreOptionsModalPos] = useState({
    top: 0,
    left: 0,
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);
  const touchCurrentYRef = useRef<number | null>(null);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isSwipeClosing, setIsSwipeClosing] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      const targetElement = target instanceof Element ? target : null;
      const clickedInsideSettingsModal = targetElement?.closest(
        ".settings-modal-container",
      );

      if (
        window.innerWidth < 768 &&
        sidebarRef.current &&
        targetElement &&
        !sidebarRef.current.contains(targetElement) &&
        !clickedInsideSettingsModal
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsSidebarOpen]);

  useEffect(() => {
    async function fetchRootNotes() {
      if (!session) return;
      setLoadingRootNotes(true);
      try {
        const response = await api.get("/notes", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        setRootNotes(response.data);
      } catch (error) {
        console.error("Error fetching root notes:", error);
      } finally {
        setLoadingRootNotes(false);
      }
    }
    fetchRootNotes();
  }, [session]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCreateNote = async () => {
    if (!session) return;
    try {
      const response = await api.post(
        "/notes",
        { title: "" },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      const newNote = response.data;
      const cleanId = newNote.id.replace(/-/g, "");
      const url = `/${cleanId}?showMoveTo=true&saveParent=true`;

      router.push(url);
      setRootNotes((prev) => [newNote, ...prev]);
    } catch (error: unknown) {
      console.error("Error creating note:", error);
    }
  };

  const handleAddChild = async (parentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    try {
      const response = await api.post(
        "/notes",
        { title: "", parentId },
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      const newNote = response.data;
      const cleanId = newNote.id.replace(/-/g, "");
      const url = `/${cleanId}?showMoveTo=true&saveParent=true`;
      router.push(url);
    } catch (error: unknown) {
      console.error("Error creating child note:", error);
    }
  };

  const handleDeleteRootNote = (noteId: string) => {
    setRootNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768 || isFloating) {
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchCurrentXRef.current = touch.clientX;
    touchCurrentYRef.current = touch.clientY;
    setIsSwiping(true);
    setIsSwipeClosing(false);
    setSwipeOffsetX(0);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (
      window.innerWidth >= 768 ||
      isFloating ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null
    ) {
      return;
    }

    const touch = event.touches[0];
    touchCurrentXRef.current = touch.clientX;
    touchCurrentYRef.current = touch.clientY;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (isHorizontalGesture && deltaX < 0) {
      setSwipeOffsetX(Math.max(deltaX, -280));
    }
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 768 || isFloating) {
      return;
    }

    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const endX = touchCurrentXRef.current;
    const endY = touchCurrentYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchCurrentXRef.current = null;
    touchCurrentYRef.current = null;

    if (startX === null || startY === null || endX === null || endY === null) {
      setIsSwiping(false);
      setSwipeOffsetX(0);
      return;
    }

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const isLeftSwipe = deltaX < -60;
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (isLeftSwipe && isHorizontalGesture) {
      setIsSwiping(false);
      setIsSwipeClosing(true);
      setSwipeOffsetX(-320);
      return;
    }

    setIsSwiping(false);
    setIsSwipeClosing(false);
    setSwipeOffsetX(0);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {!isFloating && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <motion.div
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`group/sidebar w-80 md:w-60 bg-white text-gray-700 dark:bg-[#202020] dark:text-[#ada9a3] flex flex-col text-sm select-none ${isFloating ? "h-full max-h-[70vh]" : "h-screen border-r border-gray-200 dark:border-[#2f2f2f]"} ${!isFloating ? "fixed inset-y-0 left-0 z-50 md:relative" : ""}`}
        animate={
          !isFloating ? { x: isSwipeClosing ? -320 : swipeOffsetX } : undefined
        }
        transition={
          !isFloating
            ? isSwiping
              ? { duration: 0 }
              : { duration: 0.2, ease: "easeOut" }
            : undefined
        }
        onAnimationComplete={() => {
          if (isSwipeClosing) {
            setIsSidebarOpen(false);
          }
        }}
      >
        {/* Header */}
        <div
          className={`group relative flex items-center justify-between mt-1.5 mx-2 rounded-md transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-[#252525] ${isUserModalOpen ? "bg-gray-100 dark:bg-[#252525]" : ""}`}
        >
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setUserModalPos({ top: rect.bottom + 5, left: rect.left + 10 });
              setIsUserModalOpen(true);
            }}
            className="flex items-center py-1.5 px-2 gap-2 transition-all duration-200 group-hover:opacity-100 flex-1 min-w-0"
          >
            <div className="w-5 h-5 bg-gray-200 dark:bg-[#fffff315] rounded flex items-center justify-center text-sm font-medium text-gray-700 dark:text-[#ada9a3] shrink-0">
              <span className="leading-none select-none uppercase">n</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-gray-900 dark:text-[#f0efed] text-sm truncate font-medium leading-none">
                {userName}
              </span>
              <div className="hidden group-hover:flex items-center text-gray-500 hover:text-gray-900 dark:text-[#ada9a3] dark:hover:text-white">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center shrink-0 pr-1 gap-0.5">
            {/* Collapse Button (Shown on Hover) */}
            {!isFloating && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }}
                className="hidden group-hover/sidebar:flex items-center justify-center w-7 h-7 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:text-[#ada9a3] dark:hover:text-white"
                title={t("actions.closeSidebarTitle")}
              >
                <ChevronsLeft size={20} />
              </button>
            )}

            {/* Default Icons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNote();
              }}
              className="flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors dark:text-[#ada9a3] dark:hover:text-white dark:hover:bg-[#2f2f2f]"
              title={t("actions.createPageTitle")}
            >
              <SquarePen size={18} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMoreOptionsModalPos({
                  top: rect.bottom + 5,
                  left: rect.left - 40,
                });
                setIsMoreOptionsModalOpen(true);
              }}
              className={`flex items-center justify-center w-5 h-7 hover:bg-gray-200 rounded hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:hover:text-white ${isMoreOptionsModalOpen ? "bg-gray-200 text-gray-900 dark:bg-[#3f3f3f] dark:text-white" : "text-gray-600 dark:text-[#ada9a3]"}`}
              title={t("actions.moreOptionsTitle")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="px-2 py-1">
          <NavItem
            icon={<Search size={20} />}
            label={t("nav.search.label")}
            onClick={() => setIsSearchModalOpen(true)}
            title={t("nav.search.title")}
          />
          <NavItem
            icon={<Home size={20} />}
            label={t("nav.home.label")}
            href="/"
            isActive={pathname === "/"}
            title={t("nav.home.title")}
          />
          <NavItem
            icon={<Users size={20} />}
            label={t("nav.meetings.label")}
            title={t("nav.meetings.title")}
            onHoverClick={() => {
              // Logica para criar nova anotação IA
              handleCreateNote();
            }}
            hoverIconTitle={t("nav.meetings.hoverIconTitle")}
          />
          <NavItem
            icon={<Sparkle size={20} />}
            label={t("nav.ai.label")}
            title={t("nav.ai.title")}
            onHoverClick={() => {
              // Logica para ver histórico do chat
              console.log(t("nav.ai.openChatHistoryLog"));
            }}
            hoverIcon={History}
            hoverIconTitle={t("nav.ai.hoverIconTitle")}
          />
          <NavItem
            icon={<Inbox size={20} />}
            label={t("nav.inbox.label")}
            title={t("nav.inbox.title")}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Favorites Section */}
          {(isLoadingFavorites || favoriteNotes.length > 0) && (
            <div className="mt-4 px-2">
              <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-[#9b9b9b]">
                {t("sections.favorites")}
              </div>
              {expandedSections.favoritos && (
                <div className="py-1">
                  {isLoadingFavorites ? (
                    <div className="flex flex-col gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <SidebarItemSkeleton key={`fav-skeleton-${i}`} />
                      ))}
                    </div>
                  ) : (
                    favoriteNotes.map((note) => (
                      <SidebarItem
                        key={`fav-${note.id}`}
                        note={note}
                        session={session}
                        onAddChild={handleAddChild}
                        onDelete={handleDeleteRootNote}
                        currentPathname={pathname}
                        isFloating={isFloating}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Particular Section */}
          <div className="mt-4 px-2">
            <button
              onClick={() => toggleSection("particular")}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors group dark:text-[#9b9b9b] dark:hover:bg-[#2f2f2f] dark:hover:text-[#ada9a3]"
            >
              <span>{t("sections.private")}</span>
              <Plus
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>

            {expandedSections.particular && (
              <div className="py-1">
                {loadingRootNotes ? (
                  <div className="flex flex-col gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <SidebarItemSkeleton key={i} />
                    ))}
                  </div>
                ) : rootNotes.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-gray-400 dark:text-[#555]">
                    {t("sections.noNotes")}
                  </div>
                ) : (
                  rootNotes.map((note) => (
                    <SidebarItem
                      key={note.id}
                      note={note}
                      session={session}
                      onAddChild={handleAddChild}
                      onDelete={handleDeleteRootNote}
                      currentPathname={pathname}
                      isFloating={isFloating}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Compartilhado Section */}
          <div className="mt-4 px-2">
            <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-[#9b9b9b]">
              {t("sections.shared")}
            </div>
            <div className=" py-1">
              <button className="flex items-center text-sm gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] rounded w-full text-left transition-colors">
                <Plus size={16} />
                <span>{t("sections.startCollaborating")}</span>
              </button>
            </div>
          </div>

          {/* Aplicativos do Nolio */}
          <div className="mt-4 px-2">
            <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-[#9b9b9b]">
              {t("sections.apps")}
            </div>
            <div className="py-1">
              <NavItem icon={<Mail size={20} />} label={t("apps.mail")} />
              <NavItem
                icon={<Calendar size={20} />}
                label={t("apps.calendar")}
              />
              <NavItem
                icon={<Smartphone size={20} />}
                label={t("apps.android")}
                href="https://github.com/jefersonprimer/nolio-app/releases/tag/v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
              />
            </div>

            <div className="my-4 text-base">
              <NavItem
                icon={<Settings size={20} />}
                label={t("apps.settings")}
                onClick={() => setIsSettingsModalOpen(true)}
              />
              <NavItem
                icon={<Layers size={20} />}
                label={t("apps.templates")}
              />
              <NavItem
                icon={<Trash2 size={20} />}
                label={t("apps.trash")}
                onClick={() => setIsTrashModalOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 dark:border-[#2f2f2f]">
          <div className="px-2 py-1.5">
            <button className="hover:bg-gray-100 p-1.5 rounded flex items-center transition-colors text-gray-600 hover:text-gray-900 dark:hover:bg-[#2f2f2f] dark:text-[#ada9a3] dark:hover:text-white">
              <HelpCircle size={20} />
            </button>
          </div>
        </div>

        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          position={userModalPos}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
        <SearchModal
          open={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
        />
        <TrashModal
          open={isTrashModalOpen}
          onClose={() => setIsTrashModalOpen(false)}
        />
        <SettingsModal
          open={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
        <MoreOptionsModal
          open={isMoreOptionsModalOpen}
          onClose={() => setIsMoreOptionsModalOpen(false)}
          position={moreOptionsModalPos}
        />
      </motion.div>
    </>
  );
}

function NavItem({
  icon,
  label,
  href,
  onClick,
  isActive,
  title,
  onHoverClick,
  hoverIconTitle,
  target,
  rel,
  hoverIcon: HoverIcon = Plus,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  title?: string;
  onHoverClick?: (e: React.MouseEvent) => void;
  hoverIconTitle?: string;
  target?: string;
  rel?: string;
  hoverIcon?: LucideIcon;
}) {
  const content = (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left transition-colors truncate ${
        isActive
          ? "bg-gray-100 text-gray-900 dark:bg-[#2f2f2f] dark:text-white"
          : "hover:bg-gray-100 text-gray-700 hover:text-gray-900 dark:hover:bg-[#2f2f2f] dark:text-[#ada9a3] dark:hover:text-white"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate text-sm font-medium flex-1">{label}</span>
      {onHoverClick && (
        <div
          className="hidden group-hover/navitem:flex items-center justify-center w-5 h-5 hover:bg-gray-200 rounded text-sm text-gray-500 hover:text-gray-900 dark:hover:bg-[#4a4a4a] dark:text-[#ada9a3] dark:hover:text-white"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onHoverClick(e);
          }}
          title={hoverIconTitle}
        >
          <HoverIcon size={16} />
        </div>
      )}
    </div>
  );

  const containerClasses = "group/navitem relative block w-full";

  if (href) {
    return (
      <Link
        href={href}
        className={containerClasses}
        title={title}
        target={target}
        rel={rel}
      >
        {content}
      </Link>
    );
  }

  return (
    <button className={containerClasses} onClick={onClick} title={title}>
      {content}
    </button>
  );
}
