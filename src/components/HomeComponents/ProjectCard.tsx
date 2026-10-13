import { useNavigate } from "react-router-dom";

export default function ProjectCard({ name }: { name: string }) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Nama domain = section di route kamu
    navigate(`/domain/${encodeURIComponent(name)}/datasets`);
  };

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition"
    >
      <span className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-sm font-semibold text-indigo-200">
        {name.charAt(0).toUpperCase()}
      </span>
      <p className="flex-1 truncate text-sm font-medium text-gray-200 group-hover:text-white">
        {name}
      </p>
      <span className="text-gray-600 group-hover:text-indigo-300 transition">
        →
      </span>
    </div>
  );
}
