import React, { useEffect, useRef } from "react";

const MAX_H = 160;

export function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder = "Ask Anything",
  isGenerating = false,
  onStop,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  isGenerating?: boolean;
  onStop?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  // Auto-grow
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
      if (hasText && !isGenerating) onSend();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasText || isGenerating) return;
    onSend();
    requestAnimationFrame(() => ref.current?.focus());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex items-center rounded-xl bg-[#343541] px-3 py-2"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder}
        className="flex-1 resize-none bg-transparent outline-none 
                   text-gray-200 text-sm leading-relaxed 
                   placeholder-gray-400 px-2 py-1
                   min-h-[40px] max-h-[160px]"
      />

      {isGenerating ? (
        <button
          type="button"
          onClick={onStop}
          className="ml-2 flex items-center justify-center 
                     w-9 h-9 rounded-md 
                     bg-red-600 hover:bg-red-700 
                     text-white text-lg transition"
          title="Stop"
        >
          ⏹
        </button>
      ) : (
        <button
          type="submit"
          disabled={!hasText}
          className={`ml-2 flex items-center justify-center 
                      w-9 h-9 rounded-md text-lg transition
            ${
              hasText
                ? "bg-[#19c37d] text-white hover:opacity-90"
                : "bg-gray-600 text-white opacity-60 cursor-not-allowed"
            }`}
          title="Send"
        >
          {hasText ? "↑" : "➤"}
        </button>
      )}
    </form>
  );
}
