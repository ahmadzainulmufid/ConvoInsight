import { useTypingEffect } from "../../hooks/useTypingEffect";

type Msg = { role: "user" | "assistant"; content: string };

export default function AnimatedMessageBubble({
  message,
  animate,
  fullWidth = false,
}: {
  message: Msg;
  animate: boolean;
  fullWidth?: boolean;
}) {
  const typed = useTypingEffect(message.content, 20);
  const displayed = animate ? typed : message.content;

  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
        fullWidth ? "w-full" : "max-w-[80%]"
      } ${
        message.role === "user"
          ? "bg-indigo-600/90 text-white ml-auto"
          : "bg-[#2A2B32] text-gray-100 border border-[#2F3038]"
      }`}
    >
      {displayed}
    </div>
  );
}
