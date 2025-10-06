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
      className="bg-[#2A2A2A] p-3 rounded-lg hover:bg-[#333333] cursor-pointer transition"
    >
      <p className="text-blue-400 font-semibold">{name}</p>
    </div>
  );
}
