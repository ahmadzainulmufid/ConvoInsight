import { useTypingEffect } from "../../hooks/useTypingEffect";

type Msg = { role: "user" | "assistant"; content: string };

export default function AnimatedMessageBubble({
  message,
  animate,
}: {
  message: Msg;
  animate: boolean;
}) {
  // Selalu panggil hook, tapi aktifkan hanya kalau animate = true
  const typed = useTypingEffect(message.content, 20);

  // Pilih output mana yang ditampilkan
  const displayed = animate ? typed : message.content;

  return (
    <div
      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
        message.role === "user"
          ? "bg-indigo-600/90 text-white ml-auto"
          : "bg-[#2A2B32] text-gray-100"
      }`}
    >
      {displayed}
    </div>
  );
}
