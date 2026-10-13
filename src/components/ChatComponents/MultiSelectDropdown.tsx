// src/components/ChatComponents/MultiSelectDropdown.tsx
import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";

type Props = {
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
};

const MultiSelectDropdown: React.FC<Props> = ({
  options,
  selectedOptions,
  onChange,
  placeholder = "Select datasets",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option: string) => {
    const newSelectedOptions = selectedOptions.includes(option)
      ? selectedOptions.filter((item) => item !== option)
      : [...selectedOptions, option];
    onChange(newSelectedOptions);
  };

  const getDisplayText = () => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }
    if (selectedOptions.length === 1) {
      return selectedOptions[0];
    }
    return `${selectedOptions.length} datasets selected`;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center rounded-xl bg-[#0d1017]/70 border border-white/10 hover:border-white/20 text-gray-100 text-sm px-3.5 py-2.5 transition focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10"
      >
        <span className="truncate">{getDisplayText()}</span>
        <FiChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <DropdownMenu
          options={options}
          selectedOptions={selectedOptions}
          handleOptionClick={handleOptionClick}
          dropdownRef={dropdownRef}
        />
      )}
    </div>
  );
};

// 🔽 Tambahkan komponen kecil di bawah file (masih di file yang sama)
const DropdownMenu = ({
  options,
  selectedOptions,
  handleOptionClick,
  dropdownRef,
}: {
  options: string[];
  selectedOptions: string[];
  handleOptionClick: (option: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [openUp, setOpenUp] = useState(false);

  useEffect(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // jika ruang bawah kurang dari 200px dan ruang atas lebih besar
    setOpenUp(spaceBelow < 200 && spaceAbove > spaceBelow);
  }, [dropdownRef]);

  return (
    <div
      className={`absolute z-10 w-full rounded-xl bg-[#151923]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 max-h-60 overflow-y-auto p-1 ${
        openUp ? "bottom-full mb-1" : "mt-1"
      }`}
    >
      <ul className="space-y-0.5">
        {options.map((option) => (
          <li
            key={option}
            onClick={() => handleOptionClick(option)}
            className="px-3 py-2 rounded-lg text-sm text-gray-200 cursor-pointer hover:bg-white/5 flex items-center transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedOptions.includes(option)}
              readOnly
              className="h-4 w-4 rounded-lg border-gray-500 bg-gray-800 accent-indigo-500 focus:ring-indigo-500 mr-3"
            />
            <span>{option}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MultiSelectDropdown;
