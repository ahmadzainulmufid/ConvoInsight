import React, { useEffect, useRef } from "react";

const MAX_H = 160;

export function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder = "Ask Anything",
  isGenerating = false,
  onStop,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  isGenerating?: boolean;
  onStop?: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

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
      className="w-full flex items-center rounded-xl bg-gray-700 px-3 py-2"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
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
               w-9 h-9 rounded-md text-lg text-red-400 
               hover:text-red-300 transition"
          title="Stop generating"
        >
          ⏹
        </button>
      ) : (
        <button
          type="submit"
          disabled={!hasText || disabled || isGenerating}
          className={`ml-2 flex items-center justify-center 
                w-9 h-9 rounded-md text-lg transition
      ${
        hasText
          ? "bg-transparent text-white opacity-80 hover:opacity-100 cursor-pointer"
          : "bg-transparent text-white opacity-40 cursor-not-allowed"
      }`}
          title="Send"
        >
          {hasText ? "↑" : "➤"}
        </button>
      )}
    </form>
  );
}
