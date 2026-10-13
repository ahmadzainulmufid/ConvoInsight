import newLogo from "/newlogo.png";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-16 bg-[#0d1017]/80 backdrop-blur-xl border-b border-white/5 z-40 flex justify-between items-center px-6 h-16">
      {/* Sisi Kiri: Logo dan Nama */}
      <div className="flex items-center gap-2.5">
        <img src={newLogo} alt="ConvoInsight Logo" className="h-8 w-8" />
        <h2 className="font-semibold text-lg tracking-tight text-gray-100">
          Convo<span className="text-gradient">Insight</span>
        </h2>
      </div>
    </nav>
  );
}
