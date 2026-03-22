"use client";

import { useState } from "react";
import {
  Plus,
  ChevronDown,
  AtSign,
  MessageSquareText,
  ImageIcon,
  Trash,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { MENU_ITEMS } from "./SlashMenu";
import { BACK_COLORS, TEXT_COLORS } from "./ColorModal";

const COLOR_LABELS: Record<string, string> = {
  "#37352f": "cinza escuro",
  "#787774": "cinza",
  "#976d57": "marrom",
  "#d9730d": "laranja",
  "#cb912f": "amarelo",
  "#448361": "verde",
  "#337ea9": "azul",
  "#7858cc": "roxo",
  "#d15796": "rosa",
  "#df5452": "vermelho",
};

export default function FloatingMobileToolbar({
  isVisible,
  position,
  focusedBlockId,
}: {
  isVisible: boolean;
  position?: { top: number; left: number };
  focusedBlockId?: string | null;
}) {
  const [showSlashModal, setShowSlashModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);

  if (!isVisible) return null;

  const handleSlashSelect = (type: string) => {
    // Use the focusedBlockId prop from page.tsx — this is the reliable source
    if (focusedBlockId) {
      const blockEl = document.getElementById(focusedBlockId);
      if (blockEl) {
        const event = new CustomEvent('changeBlockType', {
          bubbles: true,
          detail: { blockId: focusedBlockId, newType: type }
        });
        blockEl.dispatchEvent(event);
      }
    }

    setShowSlashModal(false);
  };

  const style: React.CSSProperties = position
    ? { top: position.top }
    : {};

  const getColorLabel = (color: string, type: "text" | "bg") => {
    const base = COLOR_LABELS[color] || color;
    return type === "text" ? `Texto ${base}` : `Fundo ${base}`;
  };

  const saveCurrentSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange());
    }
  };

  const restoreSavedSelection = () => {
    if (!savedSelection) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(savedSelection);
  };

  const applyColor = (type: "text" | "bg", color: string) => {
    restoreSavedSelection();
    if (type === "text") {
      document.execCommand("foreColor", false, color);
    } else {
      document.execCommand("hiliteColor", false, color);
    }
    setShowColorModal(false);
  };

  return (
    <>
      <div
        className={`${position ? 'absolute' : 'fixed bottom-20'} inset-x-0 mx-auto z-50 w-[95vw] max-w-180 transition-all duration-200 floating-mobile-toolbar`}
        style={style}
      >
        <div className="bg-[#2f2f2f] border border-[#444] rounded-xl shadow-xl flex overflow-hidden">

          {/* Scroll container */}
          <div className="flex overflow-x-auto overflow-y-hidden mobile-toolbar-scrollbar">

            {/* + button */}
            <ToolbarButton onClick={() => setShowSlashModal(true)}>
              <Plus size={20} />
              <ChevronDown size={16} />
            </ToolbarButton>

            {/* Transformar em */}
            <ToolbarButton text>
              Transformar em
              <ChevronDown size={16} />
            </ToolbarButton>

            {/* @ */}
            <ToolbarButton>
              <AtSign size={20} />
            </ToolbarButton>

            {/* Comment */}
            <ToolbarButton>
              <MessageSquareText size={20} />
            </ToolbarButton>

            {/* Image */}
            <ToolbarButton>
              <ImageIcon size={20} />
            </ToolbarButton>

            {/* Trash */}
            <ToolbarButton>
              <Trash size={20} />
            </ToolbarButton>

            {/* Divider group */}
            <ToolbarGroup>
              <IconButton disabled>
                <ArrowLeftToLine size={20} />
              </IconButton>

              <IconButton>
                <ArrowRightToLine size={20} />
              </IconButton>

              <IconButton>
                <ArrowUpFromLine size={20} />
              </IconButton>

              <IconButton>
                <ArrowDownFromLine size={20} />
              </IconButton>
            </ToolbarGroup>

            {/* Undo / Redo */}
            <ToolbarGroup>
              <IconButton disabled>
                <Undo2 size={20} />
              </IconButton>

              <IconButton disabled>
                <Redo2 size={20} />
              </IconButton>
            </ToolbarGroup>

            {/* Cor */}
            <ToolbarButton
              text
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                saveCurrentSelection();
                setShowColorModal(true);
              }}
            >
              Cor
              <ChevronDown size={16} />
            </ToolbarButton>

            {/* Mais */}
            <ToolbarButton text>
              Mais
              <ChevronDown size={16} />
            </ToolbarButton>

          </div>
        </div>
      </div>

      {/* Slash Menu Full-Screen Modal */}
      {showSlashModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 animate-in fade-in duration-150 mobile-slash-modal"
          onClick={() => setShowSlashModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#252525] border-t border-[#3f3f3f] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3f3f3f]">
              <span className="text-sm font-semibold text-gray-400 uppercase">Blocos básicos</span>
              <button
                onClick={() => setShowSlashModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-[#f0efed] hover:bg-[#3a3a3a] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu items */}
            <div className="overflow-y-auto py-2">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSlashSelect(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#3f3f3f] active:bg-[#4a4a4a]"
                >
                  <div className="w-8 h-8 border border-[#3f3f3f] rounded-lg flex items-center justify-center bg-[#2f2f2f] text-gray-300">
                    {item.icon}
                  </div>
                  <span className="text-base text-gray-200">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Color Full-Screen Modal (Mobile) */}
      {showColorModal && (
        <div
          className="fixed inset-0 z-[110] bg-[#191919] mobile-slash-modal"
          onClick={() => setShowColorModal(false)}
        >
          <div
            className="h-full w-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b border-[#3f3f3f] bg-[#191919]">
              <h2 className="text-base font-semibold text-[#f0efed]">Cor de bloco</h2>
              <button
                onClick={() => setShowColorModal(false)}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Cor do texto
              </div>
              <div className="flex flex-col divide-y divide-[#2a2a2a] border border-[#2f2f2f] rounded-lg overflow-hidden">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={`mobile-text-${color}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyColor("text", color)}
                    className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-[#222] active:bg-[#2b2b2b] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-5 h-5 rounded border border-[#3f3f3f]"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[15px] text-[#e8e8e8]">{getColorLabel(color, "text")}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 pb-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Cor de fundo
              </div>
              <div className="flex flex-col divide-y divide-[#2a2a2a] border border-[#2f2f2f] rounded-lg overflow-hidden">
                {BACK_COLORS.map((color) => (
                  <button
                    key={`mobile-bg-${color}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyColor("bg", color)}
                    className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-[#222] active:bg-[#2b2b2b] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-5 h-5 rounded border border-[#3f3f3f]"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[15px] text-[#e8e8e8]">{getColorLabel(color, "bg")}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Button base */

function ToolbarButton({
  children,
  text = false,
  onMouseDown,
  onClick,
}: {
  children: React.ReactNode;
  text?: boolean;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick?: () => void;
}) {
  return (
    <button
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={`
      flex items-center justify-center
      gap-1
      h-10.5
      min-w-11
      px-3
      border-r border-[#444]
      text-[#f0efed]
      whitespace-nowrap
      shrink-0
      transition-colors
      hover:bg-[#3a3a3a]
      active:bg-[#444]
      ${text ? "font-medium text-sm px-3" : ""}
      `}
    >
      {children}
    </button>
  );
}

/* Icon only button */

function IconButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`
      w-8.5 h-10.5
      flex items-center justify-center
      transition-colors
      ${disabled ? "opacity-40 cursor-default" : "hover:bg-[#3a3a3a] active:bg-[#444]"}
      `}
    >
      {children}
    </button>
  );
}

/* Group with divider */

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex border-r border-[#444] px-1 shrink-0">
      {children}
    </div>
  );
}
