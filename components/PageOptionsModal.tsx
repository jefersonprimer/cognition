'use client'

import {
  Search,
  Link,
  Copy,
  Clipboard,
  ArrowRight,
  Trash2,
  Text,
  Maximize2,
  SlidersHorizontal,
  Lock,
  Pencil,
  Languages,
  Download,
  Upload,
  Repeat,
  Clock,
  Bell,
  GitBranch,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { formatRelativeDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

interface PageOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  updatedAt?: string;
  wordCount: number;
  onDelete?: () => void;
  onCopyPageContents?: () => void;
}

export default function PageOptionsModal({ isOpen, onClose, userName, updatedAt, wordCount, onDelete, onCopyPageContents }: PageOptionsModalProps) {
  const t = useTranslations('PageOptionsModal')
  const [smallText, setSmallText] = useState(false)
  const [fullWidth, setFullWidth] = useState(false)
  const [lockPage, setLockPage] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formattedDate = updatedAt 
    ? formatRelativeDate(new Date(updatedAt))
    : '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !isMobile) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isMobile]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-9998 backdrop-blur-[2px]"
            />
          )}

	          <motion.div 
	            ref={modalRef}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
	            className={`fixed z-9999 bg-white dark:bg-[#252525] border-gray-200 dark:border-[#2f2f2f] shadow-2xl text-base text-gray-700 dark:text-[#d4d4d4] overflow-y-auto p-1 ${
	              isMobile 
	                ? 'inset-x-0 bottom-0 rounded-t-2xl border-t' 
	                : 'right-5 top-12.5 w-64 rounded-xl border'
	            }`}
	          >
            {/* Mobile Handle */}
	            {isMobile && (
	              <div className="flex justify-center pt-3 pb-1">
	                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#3f3f3f]" />
	              </div>
	            )}

            {/* Search */}
	            <div className="hidden md:flex items-center p-2">
	              <div className="flex items-center rounded-md px-2 py-1.5 gap-2 bg-gray-100 dark:bg-[#ffffff0e] text-gray-600 dark:text-[#d4d4d4]">
	              <Search size={20} />
	              <input
	                placeholder={t('searchPlaceholder')}
	                className="text-sm w-full bg-transparent text-gray-700 dark:text-[#d4d4d4] placeholder:text-gray-400 dark:placeholder:text-[#8a8a8a] outline-none"
	              />
	              </div>
	            </div>

            <div className="md:hidden text-center">
              <p>Ações</p>
            </div>

            <div className={`${isMobile ? 'max-h-[70vh]' : 'max-h-125'}`}>

              {/* Font Options */}
              <div className="flex items-center justify-center px-2 py-1.5">
                <FontOption label={t('fonts.default')} active />
                <FontOption label={t('fonts.serif')} />
                <FontOption label={t('fonts.mono')} />
              </div>

              <MenuItem icon={<Link size={18} />} label={t('items.copyLink')} shortcut={!isMobile ? t('shortcuts.copyLink') : undefined} />
              <MenuItem
                icon={<Clipboard size={18} />}
                label={t('items.copyPageContents')}
                onClick={() => {
                  onCopyPageContents?.();
                  onClose();
                }}
              />
              <MenuItem icon={<Copy size={18} />} label={t('items.duplicate')} shortcut={!isMobile ? t('shortcuts.duplicate') : undefined} />
              <MenuItem icon={<ArrowRight size={18} />} label={t('items.moveTo')} shortcut={!isMobile ? t('shortcuts.moveTo') : undefined} />
              <MenuItem icon={<Trash2 size={18} />} label={t('items.moveToTrash')} isMoveTrash onClick={onDelete} />

              <Divider />

              <ToggleItem
                icon={<Text size={18} />}
                label={t('items.smallText')}
                checked={smallText}
                onChange={() => setSmallText(!smallText)}
              />

              <ToggleItem
                icon={<Maximize2 size={18} />}
                label={t('items.fullWidth')}
                checked={fullWidth}
                onChange={() => setFullWidth(!fullWidth)}
              />

              <MenuItem icon={<SlidersHorizontal size={18} />} label={t('items.customizePage')} />


              <Divider />
              <ToggleItem
                icon={<Lock size={18} />}
                label={t('items.lockPage')}
                checked={lockPage}
                onChange={() => setLockPage(!lockPage)}
              />
              <Divider />

              <MenuItem icon={<Pencil size={18} />} label={t('items.suggestEdits')} />
              <MenuItem icon={<Languages size={18} />} label={t('items.translate')} hasArrow />
              <Divider />

              <MenuItem icon={<Download size={18} />} label={t('items.import')} />
              <MenuItem icon={<Upload size={18} />} label={t('items.export')} />
              <Divider />

              <MenuItem icon={<Repeat size={18} />} label={t('items.turnIntoWiki')} />

              <Divider />

              <MenuItem icon={<Clock size={18} />} label={t('items.updatesAndAnalytics')} />
              <MenuItem icon={<Clock size={18} />} label={t('items.versionHistory')} />


              <Divider />
              <MenuItem icon={<Bell size={18} />} label={t('items.notifyMe')} shortcut={!isMobile ? t('shortcuts.comments') : undefined} hasArrow />
              <Divider />

              <MenuItem icon={<GitBranch size={18} />} label={t('items.connections')} shortcut={!isMobile ? t('shortcuts.none') : undefined} hasArrow />

	              <div className="px-4 py-2 text-xs text-gray-500 dark:text-[#7a7a7a] border-t border-gray-200 dark:border-[#2a2a2a] space-y-1">
	                <p>{t('wordCount', { count: wordCount })}</p>
	                <div className="mt-1">
	                  {t('lastEditedBy', { name: userName || t('user.fallbackName') })} <br />
	                  {formattedDate}
	                </div>
	              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ---------------- Components ---------------- */

function MenuItem({
  icon,
  label,
  shortcut,
  hasArrow,
  isMoveTrash,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  hasArrow?: boolean
  isMoveTrash?: boolean
  onClick?: () => void
}) {
	  return (
	    <div 
	      className="flex items-center rounded-md justify-between px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] cursor-pointer transition-colors"
	      onClick={onClick}
	    >
	      <div 
          className={`flex items-center gap-2 text-gray-500 dark:text-[#bdbdbd] ${ isMoveTrash ? 'hover:text-[#e56458]' : ''}`}
        >
	        <span className="flex items-center justify-center">{icon}</span>
	        <span className="leading-none text-sm">{label}</span>
	      </div>

	      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-[#8a8a8a]">
	        {shortcut && <span className="leading-none">{shortcut}</span>}
	        {hasArrow && <span className="leading-none text-lg">›</span>}
	      </div>
	    </div>
	  )
}

function ToggleItem({
  icon,
  label,
  checked,
  onChange,
	}: {
	  icon: React.ReactNode
	  label: string
	  checked: boolean
	  onChange: () => void
	}) {
	  return (
	    <div className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] cursor-pointer transition-colors">
	      <div className="flex items-center gap-3">
	        <span className="text-gray-500 dark:text-[#bdbdbd] flex items-center justify-center">{icon}</span>
	        <span className="leading-none text-sm">{label}</span>
	      </div>

      <button
	        onClick={onChange}
	        className={`relative h-5 w-9 rounded-full transition-colors ${
	          checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-[#3a3a3a]'
	        }`}
	      >
	        <span
	          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
	            checked ? 'translate-x-4' : 'translate-x-0.5'
	          }`}
	        />
	      </button>
	    </div>
	  )
}

function Divider() {
	  return <div className="my-1 h-px bg-gray-200 dark:bg-[#2a2a2a]" />
}

function FontOption({ label, active }: { label: string; active?: boolean }) {
	  return (
	    <div className="flex flex-col items-center cursor-pointer group w-24 h-16 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-[#ffffff0e]">
	      <span
	        className={`text-2xl ${
	          active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-[#d4d4d4]'
	        }`}
	      >
	        Ag
	      </span>
	      <span className="text-sm text-gray-500 group-hover:text-gray-900 dark:text-[#8a8a8a] dark:group-hover:text-[#d4d4d4]">
	        {label}
	      </span>
	    </div>
	  )
}
