import React, { useEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";

const MAX_H = 160; // 10rem

export function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow + toggle overflow
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
      if (value.trim()) onSend();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend();
    requestAnimationFrame(() => ref.current?.focus());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl flex items-stretch gap-2"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={placeholder}
        className={[
          "flex-1 resize-none rounded border border-[#3a3b42] bg-transparent",
          "px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500",
          "min-h-[44px]", // tampak seperti input 1 baris
        ].join(" ")}
        style={{ maxHeight: MAX_H }}
      />

      <button
        type="submit"
        disabled={!value.trim()}
        className="h-[44px] px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
        title="Send"
      >
        <FiSend />
        <span className="hidden sm:inline">Send</span>
      </button>
    </form>
  );
}
