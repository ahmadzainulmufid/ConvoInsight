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

  const isUser = message.role === "user";

  return (
    <div
      className={`
        px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm
        ${fullWidth ? "w-full max-w-none" : "max-w-[80%]"}
        ${
          isUser
            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white ml-auto w-fit shadow-indigo-900/30"
            : "rounded-2xl rounded-bl-md bg-[#151923] text-gray-100 border border-white/10"
        }
      `}
    >
      {displayed}
    </div>
  );
}
