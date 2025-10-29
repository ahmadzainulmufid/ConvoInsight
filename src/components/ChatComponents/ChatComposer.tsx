// src/components/ChatComponents/ChatComposer.tsx
import React, { useEffect, useRef, useState } from "react";

const MAX_H = 160;

export function ChatComposer({
  value,
  onChange,
  onSend,
  busy = false,
  onStop,
  placeholder = "Ask Anything",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy?: boolean; // ⬅️ sama seperti ChatInput
  onStop?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  // sama persis dengan ChatInput
  const [localBusy, setLocalBusy] = useState(false);
  const effectiveBusy = localBusy || !!busy;

  const btnBase =
    "ml-2 flex items-center justify-center w-9 h-9 rounded-md text-lg transition";
  const btnActive =
    "bg-transparent text-white opacity-80 hover:opacity-100 cursor-pointer";
  const btnDisabled = "bg-transparent text-white opacity-40 cursor-not-allowed";

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
        setLocalBusy(true); // ⏹ langsung muncul
        onSend();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveBusy || !hasText) return;
    setLocalBusy(true); // ⏹ langsung muncul
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
      className={`w-full flex items-center rounded-xl bg-gray-700 px-4 py-3 ${className}`}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={effectiveBusy}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent outline-none 
                   text-gray-200 text-sm leading-relaxed 
                   placeholder-gray-400 px-3 py-2
                   min-h-[44px] max-h-[160px]"
      />

      {effectiveBusy ? (
        <button
          type="button"
          onClick={handleStop}
          className={`${btnBase} ${btnActive}`}
          title="Stop generating"
        >
          ⏹
        </button>
      ) : (
        <button
          type="submit"
          disabled={!hasText}
          className={`${btnBase} ${hasText ? btnActive : btnDisabled}`}
          title="Send"
        >
          {hasText ? "↑" : "➤"}
        </button>
      )}
    </form>
  );
}
