import { useCallback, useEffect, useState } from "react";

const KEY = "chat_history";

export type ChatItem = {
  id: string;
  title: string;
  section?: string;
  createdAt: number;
};

function read(): ChatItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: ChatItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("chats:updated"));
}

export function useChatHistory(section?: string) {
  const [items, setItems] = useState<ChatItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("chats:updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("chats:updated", sync as EventListener);
    };
  }, []);

  const add = useCallback((item: ChatItem) => {
    const cur = read();
    const next = [item, ...cur];
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((id: string) => {
    const cur = read();
    const next = cur.filter((x) => x.id !== id);
    write(next);
    setItems(next);
  }, []);

  const filtered = section
    ? items.filter((x) => x.section?.toLowerCase() === section.toLowerCase())
    : items;

  return { items: filtered, add, remove, all: items };
}
