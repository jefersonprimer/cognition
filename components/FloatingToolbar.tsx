'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Code, Copy, Link2, MessageSquareText, MoreHorizontal, Pencil, SmilePlus, Underline } from 'lucide-react'

import { SlashMenu } from './SlashMenu'
import SquareRootSmallIcon from './ui/SquareRootSmallIcon'
import CommentPencilIcon from './ui/CommentPencilIcon'
import LinkModal from './LinkModal'
import ColorModal from './ColorModal'
import ActionModal from './ActionModal'

type Position = {
  top: number
  left: number
}

type HoveredLink = {
  el: HTMLAnchorElement
  href: string
}

const isCognitionTextLink = (link: HTMLAnchorElement) => link.getAttribute('data-cognition-link') === 'true'

const getClosestCodeFromNode = (node: Node | null): HTMLElement | null => {
  const element = node instanceof Element ? node : node?.parentElement
  const code = element?.closest('code') ?? null
  if (!code?.closest('.note-editor-content')) return null
  return code as HTMLElement
}

	type FloatingToolbarProps = {
	  userName?: string
	  updatedAt?: string
	}

	export default function FloatingToolbar({ userName, updatedAt }: FloatingToolbarProps) {
	  const [visible, setVisible] = useState(false)
	  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
	  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({})
	  const [showColorModal, setShowColorModal] = useState(false)
	  const [showSlashMenu, setShowSlashMenu] = useState(false)
		const [showLinkModal, setShowLinkModal] = useState(false)
		const [linkModalAnchor, setLinkModalAnchor] = useState<{ top: number; left: number; height: number } | null>(null)
		const [linkModalInitialUrl, setLinkModalInitialUrl] = useState<string | undefined>(undefined)
		const [editingLinkEl, setEditingLinkEl] = useState<HTMLAnchorElement | null>(null)
		const [showActionModal, setShowActionModal] = useState(false)
		const [slashMenuPosition, setSlashMenuPosition] = useState<Position | null>(null)
		const [colorModalPosition, setColorModalPosition] = useState<Position | null>(null)
		const [actionModalPosition, setActionModalPosition] = useState<Position | null>(null)
		const [savedSelection, setSavedSelection] = useState<Range | null>(null)
		const [hoveredLink, setHoveredLink] = useState<HoveredLink | null>(null)
		const [hoverCardPosition, setHoverCardPosition] = useState<Position | null>(null)
		const [linkCopied, setLinkCopied] = useState(false)
		const hideHoverCardTimeoutRef = useRef<number | null>(null)
		const hoveredLinkRef = useRef<HoveredLink | null>(null)
		const hoverCardActiveRef = useRef(false)
	const toolbarRef = useRef<HTMLDivElement>(null)
  const lastSelectionRectRef = useRef<DOMRect | null>(null)

  const calculateToolbarPosition = ({
    selectionRect,
    toolbarWidth,
    toolbarHeight,
  }: {
    selectionRect: DOMRect
    toolbarWidth: number
    toolbarHeight: number
  }): Position => {
    const toolbarGap = 16
    const toolbarNudgeX = 120
    const padding = 8

    const viewportWidth = window.innerWidth
    const viewportTop = 0
    const viewportBottom = window.innerHeight

    const halfWidth = toolbarWidth / 2

    let calculatedLeft = selectionRect.left + selectionRect.width / 2 + toolbarNudgeX
    let calculatedTop = selectionRect.bottom + toolbarGap

    // Clamp horizontally (left is the anchor point because we translateX(-50%))
    if (calculatedLeft + halfWidth > viewportWidth - padding) {
      calculatedLeft = viewportWidth - halfWidth - padding
    }
    if (calculatedLeft - halfWidth < padding) {
      calculatedLeft = halfWidth + padding
    }

    // Flip vertically when there's no room below
    if (calculatedTop + toolbarHeight > viewportBottom - padding) {
      calculatedTop = selectionRect.top - toolbarHeight - toolbarGap
    }
    if (calculatedTop < viewportTop + padding) {
      calculatedTop = viewportTop + padding
    }

    return { top: calculatedTop, left: calculatedLeft }
  }

  const saveCurrentSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange())
    }
  }

  const restoreSavedSelection = () => {
    if (!savedSelection) return
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(savedSelection)
  }

  const updateActiveStates = () => {
    const selection = window.getSelection()
    const anchorCode = selection ? getClosestCodeFromNode(selection.anchorNode) : null
    const focusCode = selection ? getClosestCodeFromNode(selection.focusNode) : null

    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      code: !!anchorCode && anchorCode === focusCode,
    })
  }

	const getClosestLinkFromSelection = (): HTMLAnchorElement | null => {
		const selection = window.getSelection()
		if (!selection || selection.rangeCount === 0) return null
		const anchorNode = selection.anchorNode
		const focusNode = selection.focusNode

		const anchorEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement
		const focusEl = focusNode instanceof Element ? focusNode : focusNode?.parentElement
		if (!anchorEl || !focusEl) return null

		const a1 = anchorEl.closest('a[href]') as HTMLAnchorElement | null
		const a2 = focusEl.closest('a[href]') as HTMLAnchorElement | null
		if (!a1 || !a2) return null
		if (!isCognitionTextLink(a1) || !isCognitionTextLink(a2)) return null
		if (a1 !== a2) return null
		if (!a1.closest('.note-editor-content')) return null
		return a1
	}

	const selectLinkElement = (link: HTMLAnchorElement) => {
		try {
			const range = document.createRange()
			range.selectNodeContents(link)
			const selection = window.getSelection()
			if (!selection) return
			selection.removeAllRanges()
			selection.addRange(range)
		} catch {
			// ignore
		}
	}

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()

      if (!selection || selection.rangeCount === 0) {
        if (!showColorModal && !showSlashMenu && !showLinkModal && !showActionModal) setVisible(false)
        return
      }

      const text = selection.toString().trim()
      if (text.length === 0) {
        if (!showColorModal && !showSlashMenu && !showLinkModal && !showActionModal) setVisible(false)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      lastSelectionRectRef.current = rect

      const anchorElement = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement
      const focusElement = selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode?.parentElement
      const isInsideEditor = !!anchorElement?.closest('.note-editor-content') && !!focusElement?.closest('.note-editor-content')

      if (!isInsideEditor) {
        if (!showColorModal && !showSlashMenu && !showLinkModal && !showActionModal) setVisible(false)
        return
      }

      // On first render `toolbarRef` might be null, so use a safe estimate
      // and then refine after mount via `useLayoutEffect`.
      const estimatedWidth = 200
      const estimatedHeight = 240
      const toolbarWidth = toolbarRef.current?.offsetWidth ?? estimatedWidth
      const toolbarHeight = toolbarRef.current?.offsetHeight ?? estimatedHeight

      setPosition(
        calculateToolbarPosition({
          selectionRect: rect,
          toolbarWidth,
          toolbarHeight,
        })
      )

      updateActiveStates()
      setVisible(true)
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('keyup', handleSelection)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('keyup', handleSelection)
    }
  }, [showColorModal, showSlashMenu, showLinkModal, showActionModal])

	useEffect(() => {
		const clearHideTimeout = () => {
			if (hideHoverCardTimeoutRef.current) {
				window.clearTimeout(hideHoverCardTimeoutRef.current)
				hideHoverCardTimeoutRef.current = null
			}
		}

		const scheduleHide = () => {
			clearHideTimeout()
			hideHoverCardTimeoutRef.current = window.setTimeout(() => {
				if (hoverCardActiveRef.current) return
				hoveredLinkRef.current = null
				setHoveredLink(null)
				setHoverCardPosition(null)
				setLinkCopied(false)
			}, 120)
		}

		const handleMouseOver = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null
			const link = (target?.closest('a[href]') as HTMLAnchorElement | null) ?? null
			if (!link) return
			if (!link.closest('.note-editor-content')) return
			if (!isCognitionTextLink(link)) return

			const href = link.getAttribute('href')?.trim() || ''
			if (!href) return

			clearHideTimeout()
			const next: HoveredLink = { el: link, href }
			hoveredLinkRef.current = next
			setHoveredLink(next)
		}

		const handleMouseOut = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null
			const link = (target?.closest('a[href]') as HTMLAnchorElement | null) ?? null
			if (!link) return
			if (hoveredLinkRef.current?.el !== link) return
			scheduleHide()
		}

		document.addEventListener('mouseover', handleMouseOver)
		document.addEventListener('mouseout', handleMouseOut)
		return () => {
			clearHideTimeout()
			document.removeEventListener('mouseover', handleMouseOver)
			document.removeEventListener('mouseout', handleMouseOut)
		}
	}, [])

	useEffect(() => {
		if (!hoveredLink) return

		const cardWidth = 360
		const padding = 8

		const update = () => {
			if (!document.contains(hoveredLink.el)) {
				hoveredLinkRef.current = null
				setHoveredLink(null)
				setHoverCardPosition(null)
				return
			}

			const rect = hoveredLink.el.getBoundingClientRect()
			const left = Math.min(Math.max(rect.left, padding), window.innerWidth - cardWidth - padding)
			const top = Math.min(rect.bottom + 6, window.innerHeight - 48 - padding)

			const next = { top, left }
			setHoverCardPosition((prev) => (prev && prev.top === next.top && prev.left === next.left ? prev : next))
		}

		update()
		window.addEventListener('scroll', update, true)
		window.addEventListener('resize', update)
		return () => {
			window.removeEventListener('scroll', update, true)
			window.removeEventListener('resize', update)
		}
	}, [hoveredLink])

  useLayoutEffect(() => {
    if (!visible) return
    const selectionRect = lastSelectionRectRef.current
    const el = toolbarRef.current
    if (!selectionRect || !el) return

    // Recalculate with real rendered size to ensure "flip" works near viewport edges.
    const next = calculateToolbarPosition({
      selectionRect,
      toolbarWidth: el.offsetWidth || 200,
      toolbarHeight: el.offsetHeight || 240,
    })

    setPosition((prev) => (prev.top === next.top && prev.left === next.left ? prev : next))
  }, [visible, showColorModal, showSlashMenu, showLinkModal, showActionModal])

  const execInline = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    updateActiveStates()
  }

  const handleSlashMenuSelect = (type: string) => {
    let blockEl: HTMLElement | null = null
    if (savedSelection) {
      const node = savedSelection.startContainer
      blockEl = node instanceof HTMLElement ? node.closest('[contenteditable]') : node.parentElement?.closest('[contenteditable]') || null
    }

    if (blockEl && blockEl.id) {
      const event = new CustomEvent('changeBlockType', {
        bubbles: true,
        detail: { blockId: blockEl.id, newType: type },
      })
      blockEl.dispatchEvent(event)
    }

    setShowSlashMenu(false)
    setSavedSelection(null)
  }

	const hasAnyOverlay = showLinkModal || showColorModal || showSlashMenu || showActionModal || !!hoveredLink
  if (!visible && !hasAnyOverlay) return null

	if (showActionModal) {
	    return (
	      <div
	        ref={toolbarRef}
	        style={{
	          top: actionModalPosition?.top ?? 20,
	          left: actionModalPosition?.left ?? 20,
	        }}
	        className="fixed z-50 floating-toolbar-root"
	      >
	        <ActionModal
	          onClose={() => {
	            setShowActionModal(false)
	            setActionModalPosition(null)
	            setVisible(false)
	          }}
	          userName={userName}
	          updatedAt={updatedAt}
	        />
	      </div>
	    )
	  }

  return (
    <>
			{visible && (
				<div
					ref={toolbarRef}
					style={{
						top: position.top,
						left: position.left,
						transform: 'translateX(-50%)',
					}}
					className="fixed z-50 floating-toolbar-root w-[200px] max-h-[70vh] overflow-y-auto rounded-xl border border-[#2f2f2f] bg-[#1f1f1f] p-2 shadow-2xl text-sm text-[#d4d4d4]"
				>
      <div className="flex items-center gap-1 pb-2 border-b border-[#2a2a2a]">
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            saveCurrentSelection()
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setSlashMenuPosition({ top: rect.bottom + 8, left: rect.left })
            setShowSlashMenu((prev) => !prev)
          }}
          className={`px-2 py-1 rounded-md text-sm transition-colors ${showSlashMenu ? 'bg-[#2a2a2a] text-white' : 'hover:bg-[#2a2a2a]'}`}
        >
          T
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            saveCurrentSelection()
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setColorModalPosition({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
            setShowColorModal((prev) => !prev)
          }}
          className={`px-2 py-1 rounded-md text-sm font-medium border border-[#3a3a3a] transition-colors ${showColorModal ? 'bg-[#2383e21a] text-[#2383e2]' : 'bg-[#2a2a2a] hover:bg-[#333]'}`}
        >
          A
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            execInline('bold')
          }}
          className={`px-2 py-1 rounded-md font-bold transition-colors ${activeStates.bold ? 'bg-[#2383e21a] text-[#2383e2]' : 'hover:bg-[#2a2a2a]'}`}
        >
          B
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            execInline('italic')
          }}
          className={`px-2 py-1 rounded-md italic transition-colors ${activeStates.italic ? 'bg-[#2383e21a] text-[#2383e2]' : 'hover:bg-[#2a2a2a]'}`}
        >
          I
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            execInline('underline')
          }}
          className={`px-2 py-1 rounded-md transition-colors ${activeStates.underline ? 'bg-[#2383e21a] text-[#2383e2]' : 'hover:bg-[#2a2a2a]'}`}
        >
          <Underline size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1 py-2 border-b border-[#2a2a2a]">
	        <button
	          onMouseDown={(e) => {
	            e.preventDefault()

							const existingLink = getClosestLinkFromSelection()
							if (existingLink) {
								saveCurrentSelection()
								const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
								const padding = 8
								const modalWidth = 320
								let left = rect.left
								if (left + modalWidth > window.innerWidth - padding) left = window.innerWidth - modalWidth - padding
								if (left < padding) left = padding

								setEditingLinkEl(existingLink)
								setLinkModalInitialUrl(existingLink.getAttribute('href') || existingLink.href)
								setLinkModalAnchor({ top: rect.top, left, height: rect.height })
								setShowLinkModal(true)
								return
							}

	            saveCurrentSelection()
							if (showLinkModal) {
								setShowLinkModal(false)
								setLinkModalAnchor(null)
								setLinkModalInitialUrl(undefined)
								setEditingLinkEl(null)
								return
							}

	            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
							const padding = 8
							const modalWidth = 320
							let left = rect.left
							if (left + modalWidth > window.innerWidth - padding) left = window.innerWidth - modalWidth - padding
							if (left < padding) left = padding

							setLinkModalAnchor({ top: rect.top, left, height: rect.height })
							setLinkModalInitialUrl(undefined)
							setEditingLinkEl(null)
	            setShowLinkModal(true)
	          }}
	          className={`p-1.5 rounded-md transition-colors ${showLinkModal ? 'bg-[#2383e21a] text-[#2383e2]' : 'hover:bg-[#2a2a2a]'}`}
	          aria-label="Link"
	        >
	          <Link2 size={15} />
	        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            execInline('strikeThrough')
          }}
          className={`px-2 py-1 rounded-md text-sm transition-colors ${activeStates.strikethrough ? 'bg-[#2383e21a] text-[#2383e2]' : 'hover:bg-[#2a2a2a]'}`}
        >
          <span className="line-through">S</span>
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            document.dispatchEvent(new CustomEvent('floatingToolbarInlineCode'))
            updateActiveStates()
          }}
          className={`p-1.5 rounded-md transition-colors ${activeStates.code ? 'bg-[#2383e21a] text-[#2383e2]' : 'hover:bg-[#2a2a2a]'}`}
          aria-label="Código"
        >
          <Code size={15} />
        </button>
        <button className="px-2 py-1 rounded-md hover:bg-[#2a2a2a] transition-colors flex items-center gap-1">
          <SquareRootSmallIcon size={14} />
        </button>
	        <button
	          onMouseDown={(e) => {
	            e.preventDefault()
	            setShowColorModal(false)
	            setShowLinkModal(false)
	            setShowSlashMenu(false)
	            const rect = toolbarRef.current?.getBoundingClientRect()
	            if (rect) {
	              const padding = 8
	              const modalWidth = 280
	              const desiredLeft = rect.right + 8
	              const hasRoomOnRight = desiredLeft + modalWidth <= window.innerWidth - padding

	              setActionModalPosition({
	                top: rect.top,
	                left: hasRoomOnRight ? desiredLeft : Math.max(padding, rect.left - modalWidth - 8),
	              })
	            }
	            setShowActionModal((prev) => !prev)
	          }}
	          className={`ml-auto p-1.5 rounded-md transition-colors ${showActionModal ? 'bg-[#2a2a2a] text-white' : 'hover:bg-[#2a2a2a]'}`}
	          aria-label="Mais"
	        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2 py-2 border-b border-[#2a2a2a]">
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#2a2a2a] transition-colors">
          <MessageSquareText size={15} />
          <span>Comentario</span>
        </button>
        <button className="ml-auto p-1.5 rounded-md hover:bg-[#2a2a2a] transition-colors" aria-label="Reacao">
          <SmilePlus size={15} />
        </button>
        <button className="p-1.5 rounded-md hover:bg-[#2a2a2a] transition-colors" aria-label="Criacao">
          <CommentPencilIcon size={16} />
        </button>
      </div>

	      <div className="pt-2">
	        <AiOption label="Melhoria escrita" />
	        <AiOption label="Revisao" />
	        <AiOption label="Explicar" />
	        <AiOption label="Reformatar" />
	        <AiOption label="Gerenciar habilidades" />
	      </div>

	      </div>
			)}

			{hoveredLink && hoverCardPosition && !showLinkModal && (
				<div
					className="fixed z-[70] pointer-events-auto"
					style={{ top: hoverCardPosition.top, left: hoverCardPosition.left, width: 360 }}
					onMouseEnter={() => {
						hoverCardActiveRef.current = true
					}}
					onMouseLeave={() => {
						hoverCardActiveRef.current = false
						hoveredLinkRef.current = null
						setHoveredLink(null)
						setHoverCardPosition(null)
						setLinkCopied(false)
					}}
				>
					<div className="flex items-center gap-2 rounded-lg border border-[#3a3a3a] bg-[#252525] px-2 py-1.5 shadow-2xl">
						<Link2 size={14} className="text-gray-400 shrink-0" />
						<span className="min-w-0 flex-1 truncate text-xs text-[#d4d4d4]">{hoveredLink.href}</span>
						<button
							onMouseDown={(e) => e.preventDefault()}
							onClick={async () => {
								try {
									await navigator.clipboard.writeText(hoveredLink.href)
									setLinkCopied(true)
									window.setTimeout(() => setLinkCopied(false), 900)
								} catch {
									const textarea = document.createElement('textarea')
									textarea.value = hoveredLink.href
									textarea.style.position = 'fixed'
									textarea.style.left = '-9999px'
									document.body.appendChild(textarea)
									textarea.select()
									document.execCommand('copy')
									document.body.removeChild(textarea)
									setLinkCopied(true)
									window.setTimeout(() => setLinkCopied(false), 900)
								}
							}}
							className="rounded-md p-1 hover:bg-[#2f2f2f] transition-colors"
							aria-label="Copiar link"
							title={linkCopied ? 'Copiado!' : 'Copiar'}
						>
							<Copy size={14} className={linkCopied ? 'text-[#2383e2]' : 'text-gray-300'} />
						</button>
						<button
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								const rect = hoveredLink.el.getBoundingClientRect()
								const padding = 8
								const modalWidth = 320
								let left = rect.left
								if (left + modalWidth > window.innerWidth - padding) left = window.innerWidth - modalWidth - padding
								if (left < padding) left = padding

								selectLinkElement(hoveredLink.el)
								saveCurrentSelection()
								setEditingLinkEl(hoveredLink.el)
								setLinkModalInitialUrl(hoveredLink.href)
								setLinkModalAnchor({ top: rect.top, left, height: rect.height })
								setShowLinkModal(true)
							}}
							className="rounded-md p-1 hover:bg-[#2f2f2f] transition-colors"
							aria-label="Editar link"
							title="Editar link"
						>
							<Pencil size={14} className="text-gray-300" />
						</button>
					</div>
				</div>
			)}

				{showLinkModal && linkModalAnchor && (
					<div className="fixed inset-0 z-[60] pointer-events-none">
						<div
							className="absolute pointer-events-auto"
							style={{ top: linkModalAnchor.top, left: linkModalAnchor.left, height: linkModalAnchor.height }}
						>
							<div className="relative" style={{ height: linkModalAnchor.height }}>
								<LinkModal
									initialUrl={linkModalInitialUrl}
									onApplyLink={(url) => {
										restoreSavedSelection()
										document.dispatchEvent(new CustomEvent('floatingToolbarLink', { detail: { href: url } }))
										setShowLinkModal(false)
										setLinkModalAnchor(null)
										setLinkModalInitialUrl(undefined)
										setEditingLinkEl(null)
										setSavedSelection(null)
										updateActiveStates()
									}}
									onClose={() => {
										setShowLinkModal(false)
										setLinkModalAnchor(null)
										setLinkModalInitialUrl(undefined)
										setEditingLinkEl(null)
										setSavedSelection(null)
									}}
								/>
							</div>
						</div>
					</div>
				)}

	      {showColorModal && colorModalPosition && (
	        <ColorModal
	          position={colorModalPosition}
	          onClose={() => setShowColorModal(false)}
	          onApplyColor={(type, color) => {
            restoreSavedSelection()
            document.dispatchEvent(new CustomEvent('floatingToolbarColor', {
              detail: { action: 'apply', type, color },
            }))
            updateActiveStates()
            setShowColorModal(false)
          }}
          onResetColor={(type) => {
            restoreSavedSelection()
            document.dispatchEvent(new CustomEvent('floatingToolbarColor', {
              detail: { action: 'reset', type },
            }))
            updateActiveStates()
            setShowColorModal(false)
          }}
        />
      )}

      {showSlashMenu && slashMenuPosition && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div className="absolute pointer-events-auto" style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}>
            <SlashMenu
              position={{ top: 0, left: 0 }}
              onSelect={handleSlashMenuSelect}
              onClose={() => setShowSlashMenu(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}

function AiOption({ label }: { label: string }) {
  return (
    <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#2a2a2a] transition-colors">
      {label}
    </button>
  )
}
