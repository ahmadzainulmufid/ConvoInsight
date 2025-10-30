export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-[#1A1B1E] z-50 flex justify-between items-center px-6 h-16">
      {/* Sisi Kiri: Logo dan Nama */}
      <div className="flex items-center gap-2">
        <img src="/newlogo.png" alt="ConvoInsight Logo" className="h-8 w-8" />
        <h2 className="font-bold text-lg text-gray-100">ConvoInsight</h2>
      </div>
    </nav>
  );
}
