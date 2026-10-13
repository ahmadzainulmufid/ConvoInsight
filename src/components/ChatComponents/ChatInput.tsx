import React, { useEffect, useRef, useState } from "react";
import { FiArrowUp, FiCheck, FiMic, FiSquare, FiX } from "react-icons/fi";

const MAX_H = 160;

export function ChatInput({
  value,
  onChange,
  onSend,
  busy = false,
  onStop,
  onMicClick,
  onVoiceCancel,
  onVoiceConfirm,
  isRecording = false,
  placeholder = "Ask Anything",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy?: boolean;
  onStop?: () => void;
  onMicClick?: () => void;
  onVoiceCancel?: () => void;
  onVoiceConfirm?: () => void;
  isRecording?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  const [localBusy, setLocalBusy] = useState(false);
  const effectiveBusy = localBusy || !!busy;
  const inputDisabled = effectiveBusy || isRecording;

  const btnBase =
    "ml-1 mb-1 shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200";
  const btnActive =
    "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 cursor-pointer";
  const btnDisabled = "bg-white/5 text-gray-500 cursor-not-allowed";

  useEffect(() => {
    if (!busy) setLocalBusy(false);
  }, [busy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_H);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_H ? "auto" : "hidden";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.nativeEvent as KeyboardEvent).isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!effectiveBusy && hasText) {
        setLocalBusy(true);
        onSend();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveBusy || !hasText) return;
    setLocalBusy(true);
    onSend();
    requestAnimationFrame(() => ref.current?.focus());
  };

  const handleStop = () => {
    onStop?.();
    setLocalBusy(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex items-end gap-1 rounded-2xl bg-[#151923] border border-white/10 pl-3 pr-2 py-2 shadow-xl shadow-black/30 transition focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={inputDisabled}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent outline-none 
                   text-gray-100 text-[15px] leading-relaxed 
                   placeholder-gray-500 px-2 py-2.5
                   min-h-[44px] max-h-[160px] disabled:opacity-60 transition"
      />

      {isRecording ? (
        <div className="flex items-center gap-2 mr-1 mb-0.5">
          <span className="flex items-center text-xs font-medium text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-1.5" />
            Listening...
          </span>
          <button
            type="button"
            onClick={onVoiceCancel}
            className="flex items-center justify-center w-8 h-8 rounded-full
                       bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition"
            title="Cancel voice"
          >
            <FiX size={16} />
          </button>
          <button
            type="button"
            onClick={onVoiceConfirm}
            className="flex items-center justify-center w-8 h-8 rounded-full
                       bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition"
            title="Send voice"
          >
            <FiCheck size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onMicClick}
          className="shrink-0 mb-1 flex items-center justify-center w-9 h-9 
                     rounded-full bg-transparent text-gray-400 
                     hover:text-white hover:bg-white/10 transition"
          title="Voice Input"
        >
          <FiMic size={18} />
        </button>
      )}

      {effectiveBusy ? (
        <button
          type="button"
          onClick={handleStop}
          className={`${btnBase} ${btnActive}`}
          title="Stop generating"
        >
          <FiSquare size={13} className="fill-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!hasText}
          className={`${btnBase} ${hasText ? btnActive : btnDisabled}`}
          title="Send"
        >
          <FiArrowUp size={18} />
        </button>
      )}
    </form>
  );
}
