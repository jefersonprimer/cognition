'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Link2, FileText, File } from 'lucide-react'
import api from '@/lib/api'
import { Note } from '@/types/note'
import { createNoteSlug } from '@/lib/utils'
import { useNote } from '@/context/NoteContext'

type Props = {
    onApplyLink: (url: string) => void
    onClose: () => void
    initialUrl?: string
}

export default function LinkModal({ onApplyLink, onClose, initialUrl }: Props) {
    const t = useTranslations('LinkModal')
    const { updatedTitles, updatedHasContent } = useNote()
    const [url, setUrl] = useState('')
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const modalRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [flipAbove, setFlipAbove] = useState(false)
    const defaultNoteTitle = 'Nova página'

    useEffect(() => {
        if (initialUrl) setUrl(initialUrl)
    }, [initialUrl])

    // Focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [])

    // Position: flip above if overflows
    useEffect(() => {
        if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect()
            if (rect.bottom > window.innerHeight - 8) {
                setFlipAbove(true)
            }
        }
    }, [])

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    // Fetch notes with optional search
    useEffect(() => {
        const fetchNotes = async () => {
            setLoading(true)
            try {
                const searchUrl = url && !url.startsWith('http')
                    ? `/notes?search=${encodeURIComponent(url)}`
                    : '/notes'
                const { data } = await api.get<Note[]>(searchUrl)
                setNotes(data)
            } catch (error) {
                console.error('Failed to fetch notes:', error)
            } finally {
                setLoading(false)
            }
        }
        const timeout = setTimeout(fetchNotes, 200)
        return () => clearTimeout(timeout)
    }, [url])

    const handleSubmit = () => {
        if (url.trim()) {
            const finalUrl = url.startsWith('http') || url.startsWith('/')
                ? url
                : `https://${url}`
            onApplyLink(finalUrl)
        }
    }

    const handleNoteSelect = (note: Note) => {
        const displayTitle = updatedTitles[note.id] || note.title || t('defaultNoteTitle')
        const slug = createNoteSlug(displayTitle, note.id)
        onApplyLink(`/${slug}`)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (selectedIndex >= 0 && selectedIndex < notes.length) {
                handleNoteSelect(notes[selectedIndex])
            } else {
                handleSubmit()
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => Math.min(prev + 1, notes.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, -1))
        }
    }

    return (
        <div
            ref={modalRef}
            className={`absolute left-0 z-60 w-80 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${flipAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* URL Input */}
            <div className="p-3 border-b border-[#3a3a3a]">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] focus-within:border-[#2383e2] transition-colors">
                    <Link2 size={14} className="text-gray-500 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value)
                            setSelectedIndex(-1)
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={t('input.placeholder')}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
                    />
                </div>
                {url.trim() && (url.startsWith('http') || url.includes('.')) && (
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault()
                            handleSubmit()
                        }}
                        className="w-full mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#2383e2] hover:bg-[#2383e21a] transition-colors"
                    >
                        <Link2 size={14} />
                        <span>{t('input.linkTo', { url })}</span>
                    </button>
                )}
            </div>

            {/* Notes List */}
            <div className="max-h-52 overflow-y-auto">
                {loading && notes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">{t('states.loading')}</div>
                ) : notes.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">{t('states.empty')}</div>
                ) : (
                    <div className="p-1">
                        <div className="px-2 py-1.5 text-[10px] text-gray-500 uppercase font-semibold">
                            {t('sections.linkToNote')}
                        </div>
                        {notes.slice(0, 8).map((note, index) => {
                            const title = (updatedTitles[note.id] !== undefined ? updatedTitles[note.id] : note.title) || t('defaultNoteTitle')
                            const hasContent = updatedHasContent[note.id] !== undefined
                                ? updatedHasContent[note.id]
                                : (note.title && note.title !== defaultNoteTitle && note.title.trim() !== '' && note.description && note.description.trim() !== '')

                            return (
                                <button
                                    key={note.id}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleNoteSelect(note)
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedIndex === index ? 'bg-[#2f2f2f] text-white' : 'text-[#d4d4d4] hover:bg-[#2f2f2f]'
                                        }`}
                                >
                                    <span className="text-gray-400 shrink-0">
                                        {hasContent ? <FileText size={15} /> : <File size={15} />}
                                    </span>
                                    <span className="truncate">{title}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
