'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  File,
  FileText,
  ArrowRightLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Plus, 
  Star,
  StarOff, 
  Trash2,
  Link as LinkIcon,
  Copy,
  CornerRightUp,
  SquarePen,
  ExternalLink,
  PanelRightOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Note } from '@/types/note';
import { createNoteSlug, formatRelativeDate } from '@/lib/utils';
import { useFavorite } from '@/context/FavoriteContext';
import { useNoteHasContent, useNoteTitle } from '@/context/NoteContext';
import { Session } from '@/context/AuthContext';
import Toast from './Toast';

interface SidebarItemProps {
  note: Note;
  depth?: number;
  session: Session | null;
  onAddChild: (parentId: string, e: React.MouseEvent) => void;
  onDelete: (noteId: string) => void;
  currentPathname: string | null;
  isFloating?: boolean;
}

export function SidebarItemSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <div 
      className="flex items-center gap-2 px-2 py-1.5 animate-pulse"
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <div className="w-5 h-5 bg-gray-200 dark:bg-[#2f2f2f] rounded shrink-0" />
      <div className="h-3 bg-gray-200 dark:bg-[#2f2f2f] rounded-full w-full max-w-35" />
    </div>
  );
}

function SidebarItem({
  note,
  depth = 0,
  session,
  onAddChild,
  onDelete,
  currentPathname,
  isFloating = false
}: SidebarItemProps) {
  const t = useTranslations('SidebarItem');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { favoriteNotes, toggleFavorite, removeNoteFromFavorites } = useFavorite();
  const liveTitle = useNoteTitle(note.id);
  const liveHasContent = useNoteHasContent(note.id);
  const isFavorite = favoriteNotes.some(n => n.id === note.id);

  const defaultNoteTitle = 'Nova página';
  const displayTitle = (liveTitle ?? note.title) || t('defaultNoteTitle');
  const hasContent = liveHasContent !== undefined
    ? liveHasContent
    : (note.title && note.title !== defaultNoteTitle && note.title.trim() !== '' && note.description && note.description.trim() !== '');
  
  const noteHref = `/${createNoteSlug(displayTitle, note.id)}`;
  const isActive = currentPathname === noteHref;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && !isMobile) {
        setShowOptions(false);
      }
    }
    if (showOptions && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef, isMobile, showOptions]);

  const handleToggle = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen && !hasLoaded) {
      if (!session) return;
      setIsLoading(true);
      try {
        const response = await api.get(`/notes/${note.id}/children`, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        });
        setChildren(response.data);
        setHasLoaded(true);
      } catch (error) {
        console.error('Error fetching children:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleAddChildLocal = (e: React.MouseEvent) => {
    onAddChild(note.id, e);
    if (!isOpen) setIsOpen(true);
  };

  const handleToggleFavorite = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(note);
    setShowOptions(false);
  };

  const handleCopyLink = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${noteHref}`;
    navigator.clipboard.writeText(url);
    setShowOptions(false);
    setShowToast(true);
  };

  const handleDuplicate = async (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    try {
      await api.post(`/notes/${note.id}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      window.location.reload();
    } catch (error) {
      console.error('Error duplicating note:', error);
      alert(t('alerts.duplicateError'));
    }
    setShowOptions(false);
  };

  const handleDeleteAction = async (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return;
    
    try {
      await api.delete(`/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      removeNoteFromFavorites(note.id);
      onDelete(note.id);
      setShowOptions(false);
      
      if (isActive) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert(t('alerts.deleteError'));
    }
  };

  const handleDeleteChild = (childId: string) => {
    setChildren(prev => prev.filter(c => c.id !== childId));
  };

  return (
    <div className="flex flex-col relative">
      <Link
        href={noteHref}
        className={`group/item flex items-center gap-1 px-2 py-1 rounded transition-colors relative text-sm font-medium ${
          isActive
            ? 'bg-gray-100 text-gray-900 dark:bg-[#2f2f2f] dark:text-white'
            : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900 dark:hover:bg-[#ffffff0e] dark:text-[#bcbab6] dark:hover:text-white'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Icon & Toggle */}
        <div className="flex items-center shrink-0">
          {/* Mobile Chevron: Hidden if floating, otherwise visible only on mobile (below md) */}
          <div
            role="button"
            onClick={handleToggle}
            className={isFloating ? "hidden" : "flex md:hidden items-center justify-center w-5 h-6 cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-[#3f3f3f]"}
          >
            <ChevronRight
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            />
          </div>

          {/* Desktop/Floating Icon Container */}
          <div
            role="button"
            onClick={handleToggle}
            className="relative flex items-center justify-center w-6 h-6 shrink-0 z-10 cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-[#3f3f3f]"
          >
            {/* File icon: Hidden on hover if desktop or floating */}
            {hasContent ? (
              <FileText 
                size={18} 
                className={`transition-opacity duration-200 ${isFloating ? 'group-hover/item:opacity-0' : 'md:group-hover/item:opacity-0'}`} 
              />
            ) : (
              <File 
                size={18} 
                className={`transition-opacity duration-200 ${isFloating ? 'group-hover/item:opacity-0' : 'md:group-hover/item:opacity-0'}`} 
              />
            )}
            
            {/* Desktop/Floating Chevron: Shown only on hover */}
            <div className={isFloating 
              ? "flex absolute inset-0 items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200"
              : "hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200"
            }>
              <ChevronRight
                size={16}
                className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <span className="truncate text-sm font-medium flex-1 pr-14">{displayTitle}</span>

        {/* Actions (Hover-only if floating or desktop, always visible if non-floating mobile) */}
        <div className={isFloating
          ? "hidden group-hover/item:flex items-center absolute right-2 gap-1"
          : "flex md:hidden md:group-hover/item:flex items-center absolute right-2 gap-1"
        }>
          <div className="relative">
            <button
              className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 relative dark:hover:bg-[#3f3f3f] dark:text-[#ada9a3] dark:hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowOptions(!showOptions);
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                {showOptions && (
                  <>
                    {/* Mobile Overlay */}
                    {isMobile && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowOptions(false);
                        }}
                        className="fixed inset-0 bg-black/60 z-9998 backdrop-blur-[2px]"
                      />
                    )}
                    
                    <motion.div
                      ref={menuRef}
                      initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                      animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                      exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      drag={isMobile ? "y" : false}
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 100 || info.velocity.y > 500) {
                          setShowOptions(false);
                        }
                      }}
                      className={`fixed z-9999 p-1 shadow-2xl text-sm bg-white text-gray-700 border-gray-200 dark:bg-[#2b2b2b] dark:text-[#cfcfcf] dark:border-[#3a3a3a] ${
                        isMobile 
                          ? 'inset-x-0 bottom-0 rounded-t-2xl border-t pb-8' 
                          : 'w-70 border rounded-xl py-2'
                      }`}
                      style={!isMobile ? {
                        bottom: '20px',
                        left: '200px',
                      } : {}}
                    >
                      {/* Mobile Handle */}
                      {isMobile && (
                        <div className="flex justify-center pt-3 pb-1">
                          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f3f]" />
                        </div>
                      )}

                      {/* Section Title */}
                      <div className="px-3 pb-1 text-xs text-gray-500 dark:text-[#8f8f8f] pt-1">{t('menu.sectionTitle')}</div>

                      {/* Adicionar/Remover dos favoritos */}
                      <button 
                        className="w-full flex rounded-md items-center justify-between px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors dark:text-[#f0efed] dark:hover:text-white dark:hover:bg-[#ffffff0e]"
                        onPointerUp={handleToggleFavorite}
                      >
                        <div className="flex items-center gap-2 ">
                          {isFavorite ? <StarOff size={18} /> : <Star size={18} />}
                          <span className="text-sm">{isFavorite ? t('menu.removeFromFavorites') : t('menu.addToFavorites')}</span>
                        </div>
                      </button>

                      {/* Copiar link */}
                      <button 
                        className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]"
                        onPointerUp={handleCopyLink}
                      >
                        <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                          <LinkIcon size={18}/>
                          <span className="text-sm">{t('menu.copyLink')}</span>
                        </div>
                      </button>

                      {/* Duplicar */}
                      <button 
                        className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]"
                        onPointerUp={handleDuplicate}
                      >
                        <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                          <Copy size={18}/>
                          <span className="text-sm">{t('menu.duplicate')}</span>
                        </div>
                        {!isMobile && <span className="text-xs text-gray-400 dark:text-[#8a8a8a]">Ctrl+D</span>}
                      </button>

                      {/* Renomear */}
                      <button className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]">
                        <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                          <SquarePen size={18} />
                          <span className="text-sm">{t('menu.rename')}</span>
                        </div>
                        {!isMobile && <span className="text-xs text-gray-400 dark:text-[#8a8a8a]">Ctrl+R</span>}
                      </button>

                      {/* Mover para */}
                      <button className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]">
                        <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                          <CornerRightUp size={18}/>
                          <span className="text-sm">{t('menu.moveTo')}</span>
                        </div>
                        {!isMobile && <span className="text-xs text-gray-400 dark:text-[#8a8a8a]">Ctrl+P</span>}
                      </button>

                      {/* Divider */}
                      <div className="my-2 border-t border-gray-200 dark:border-[#3a3a3a]" />

                      {/* Mover para lixeira */}
                      <button 
                        className="w-full rounded-md flex items-center justify-between px-2 py-1 text-gray-700 hover:text-red-600 hover:bg-gray-100 transition-colors dark:text-[#f0efed] dark:hover:text-red-400 dark:hover:bg-[#3a3a3a]"
                        onPointerUp={handleDeleteAction}
                      >
                        <div className="flex items-center gap-2">
                          <Trash2 size={18} />
                          <span className="text-sm">{t('menu.moveToTrash')}</span>
                        </div>
                      </button>

                      {/* Transformar em wiki */}
                      <button className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]">
                        <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                          <ArrowRightLeft size={18} />
                          <span className="text-sm">{t('menu.turnIntoWiki')}</span>
                        </div>
                      </button>

                      {/* Abrir em nova guia */}
                      <button className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]">
                        <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                          <ExternalLink size={18}/>
                          <span className="text-sm">{t('menu.openInNewTab')}</span>
                        </div>
                        {!isMobile && <span className="text-xs text-gray-400 dark:text-[#8a8a8a]">Ctrl+↵</span>}
                      </button>

                      {/* Abrir no modo lado a lado */}
                      {!isMobile && (
                        <button className="w-full rounded-md flex items-center justify-between px-2 py-1 hover:bg-gray-100 transition-colors dark:hover:bg-[#3a3a3a]">
                          <div className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-[#f0efed] dark:hover:text-white">
                            <PanelRightOpen size={18} />
                            <span className="text-sm flex-1 truncate max-w-40">{t('menu.openInSideBySide')}</span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-[#8a8a8a]">Alt+Click</span>
                        </button>
                      )}

                      {/* Footer */}
                      <div className="mt-2 pt-2 border-t border-gray-200 px-3 text-xs text-gray-500 dark:border-[#3a3a3a] dark:text-[#7a7a7a]">
                        {t('menu.lastEditedBy', { name: session?.user?.name || t('user.fallbackName') })} <br />
                        {formatRelativeDate(new Date(note.updated_at))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
          
          <button
            className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 dark:hover:bg-[#3f3f3f] dark:text-[#ada9a3] dark:hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddChildLocal(e);
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </Link>

      {showToast && (
        <Toast 
          message={t('toast.linkCopied')}
          onClose={() => setShowToast(false)} 
        />
      )}

      {/* Children */}
      {isOpen && (
        <div>
          {isLoading && (
            <div className="flex flex-col gap-0.5">
              {[...Array(3)].map((_, i) => (
                <SidebarItemSkeleton key={i} depth={depth + 1} />
              ))}
            </div>
          )}
          {!isLoading && children.length === 0 && hasLoaded && (
            <div className="py-1 text-sm text-gray-400 dark:text-[#555]" style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}>
              {t('empty.noPages')}
            </div>
          )}
          {children.map(child => (
            <SidebarItem
              key={child.id}
              note={child}
              depth={depth + 1}
              session={session}
              onAddChild={onAddChild}
              onDelete={handleDeleteChild}
              currentPathname={currentPathname}
              isFloating={isFloating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(SidebarItem);
