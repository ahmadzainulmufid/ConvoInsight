import { useEffect, useMemo, useRef, useState } from "react";

type MsgType = "human" | "assistant" | "panic" | "loader";

type Message = {
  id: string;
  type: MsgType;
  text: string;
};

const isTouchDevice = () => "ontouchstart" in window;

export default function NanoJarvis() {
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // auto-focus (hindari di perangkat touch)
  useEffect(() => {
    if (!isTouchDevice()) inputRef.current?.focus();
  }, []);

  // salam pembuka
  useEffect(() => {
    const id = crypto.randomUUID();
    setTimeout(() => {
      setMessages([
        { id, type: "assistant", text: "Halo, This is a DataInsight" },
      ]);
      if (!isTouchDevice()) inputRef.current?.focus();
    }, 100);
  }, []);

  // auto-scroll ke bawah setiap pesan berubah
  useEffect(() => {
    chatRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendMessage = (type: MsgType, text = "") => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, type, text }]);
    return id;
  };

  const removeFirstOfType = (type: MsgType) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.type === type);
      if (idx === -1) return prev;
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
  };

  const updateMessageText = (id: string, text: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
  };

  const ask = async (question: string, handler?: (answer: string) => void) => {
    if (!question.trim()) return;
    appendMessage("human", question);
    inputRef.current?.blur();

    // render bubble assistant kosong lebih dulu supaya stream mengisi ke sini
    const assistantId = appendMessage("assistant", "");

    const url = `/chat?${encodeURIComponent(question)}`;

    // beri sedikit jeda biar loader kelihatan
    setTimeout(get, 100);

    async function get() {
      let answer = "";
      try {
        const res = await fetch(url);
        removeFirstOfType("loader");

        // streaming
        const reader = res.body?.getReader();
        if (!reader) {
          updateMessageText(
            assistantId,
            "⚠️ Your browser does not support streaming."
          );
          return;
        }

        // baca chunk
        // biome-ignore lint/suspicious/noConstantBinaryExpression: TS helper
        const decoder = new TextDecoder();
        // loop
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          answer += chunk;
          updateMessageText(assistantId, answer);
        }
      } catch (e) {
        removeFirstOfType("loader");
        const msg = e instanceof Error ? e.message : String(e);
        appendMessage("panic", `Something is wrong: ${msg}`);
      } finally {
        removeFirstOfType("loader");
        handler?.(answer);
        if (!isTouchDevice()) inputRef.current?.focus();
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const el = e.currentTarget;
      const q = el.value.trim();
      if (q.length > 0) {
        void ask(q);
        el.value = "";
      }
    }
  };

  // CSS inline agar file tunggal seperti HTML asal
  const styles = useMemo(
    () => `
      html { line-height: 1.5; background-color: white;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
        "Segoe UI Symbol", "Noto Color Emoji"; }
      .full-h { margin: 0; padding: 0; height: 100%; }
      body { display: flex; flex-direction: column; color: white; color-scheme: light; }
      *, ::after, ::before { box-sizing: border-box; border-width: 0; border-style: solid; border-color: currentColor; }
      footer { flex: none; padding: 0; }
      main#chat { padding: 1rem; overflow-y: auto; -webkit-overflow-scrolling: touch; flex: auto; }
      .input-container { display: flex; justify-content: center; align-items: center; flex-direction: row; }
      input, textarea { font-family: inherit; margin: 0; color: white; width: 100%; height: 3rem;
        padding-left: 1rem; padding-right: 1rem; font-size: 1rem; line-height: 1.5rem; border: 2px solid white;
        background-color: black; border-radius: .5rem; }
      input:focus, textarea:focus { outline: none; }
      input:disabled, input[disabled] { cursor: not-allowed; }
      .speech { display: grid; column-gap: .75rem; padding-top: .25rem; padding-bottom: .25rem; }
      .speech-loader, .speech-assistant { place-items: start; }
      .speech-human, .speech-panic { place-items: end; }
      .speech-bubble-loader, .speech-bubble-assistant, .speech-bubble-human, .speech-bubble-panic {
        display: block; white-space: pre-line; position: relative; width: fit-content; padding: .5rem 1rem;
        min-height: 2.5rem; min-width: 2.5rem; max-width: 90%; border-radius: 0.5rem; border: none;
      }
      .speech-bubble-assistant { border-color: #FBFFFE; box-shadow: .1rem .1rem .2rem #C8D0CB; }
      .speech-bubble-human { border-color: #127475; }
      .speech-bubble-panic { border-color: #9B239D; }
      .color-assistant { background-color: #FBFFFE; color: #131614; border: 1px solid #D3D9D5; }
      .color-human { background-color: #127475; color: #FBFFFE; }
      .color-panic { background-color: #9B239D; color: #ddd; }
      .loader { width: 2em; aspect-ratio: 2;
        background: no-repeat linear-gradient(#000 0 0),
                    no-repeat linear-gradient(#000 0 0),
                    no-repeat linear-gradient(#000 0 0);
        background-size: 20% 50%; animation: load 1s infinite linear; }
      @keyframes load {
        0% { background-position: 0% 100%, 50% 100%, 100% 100% }
        20% { background-position: 0% 50%, 50% 100%, 100% 100% }
        40% { background-position: 0% 0%, 50% 50%, 100% 100% }
        60% { background-position: 0% 100%, 50% 0%, 100% 50% }
        80% { background-position: 0% 100%, 50% 100%, 100% 0% }
        100% { background-position: 0% 100%, 50% 100%, 100% 100% }
      }
    `,
    []
  );

  return (
    <div
      className="full-h"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* style inline agar file tunggal */}
      <style>{styles}</style>

      <main id="chat" ref={chatRef} style={{ flex: "auto" }}>
        {messages.map((m) => (
          <div className={`speech speech-${m.type}`} key={m.id}>
            <div className={`speech-bubble-${m.type} color-${m.type}`}>
              {m.type === "loader" ? <div className="loader" /> : m.text}
            </div>
          </div>
        ))}
      </main>

      <footer>
        <div className="input-container">
          <input
            id="prompt"
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder="Ask something"
            onKeyDown={onKeyDown}
          />
        </div>
      </footer>
    </div>
  );
}
