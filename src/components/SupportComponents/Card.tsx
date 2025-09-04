// components/CardStat.jsx
import {
  FiDollarSign,
  FiUsers,
  FiShoppingCart,
  FiBarChart2,
  FiInfo,
} from "react-icons/fi";

const icons = {
  revenue: <FiDollarSign className="text-gray-400 w-5 h-5" />,
  users: <FiUsers className="text-gray-400 w-5 h-5" />,
  conversion: <FiBarChart2 className="text-gray-400 w-5 h-5" />,
  order: <FiShoppingCart className="text-gray-400 w-5 h-5" />,
};

type CardStatProps = {
  title: string;
  value: string | number;
  change: string;
  type: keyof typeof icons;
};

type InfoCardProps = {
  title: string;
  description: string;
};

type CardSuggestionProps = {
  title: string;
};

const CardStat = ({ title, value, change, type }: CardStatProps) => {
  const isPositive = change.startsWith("+");

  return (
    <div className="bg-white dark:bg-[#1e1f23] rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <div>
        <h4 className="text-sm text-gray-500">{title}</h4>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
        <p
          className={`text-sm ${
            isPositive ? "text-green-500" : "text-red-500"
          }`}
        >
          {change} vs last month
        </p>
      </div>
      <div className="text-right">{icons[type]}</div>
    </div>
  );
};

export const InfoCard = ({ title, description }: InfoCardProps) => {
  return (
    <div className="bg-white dark:bg-[#1e1f23] rounded-lg shadow-md p-4 flex items-start space-x-4 w-full border border-gray-200 dark:border-gray-700">
      {/* Icon */}
      <div className="mt-1">
        <FiInfo className="text-blue-500 w-5 h-5" />
      </div>

      {/* Content */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {description}
        </p>
      </div>
    </div>
  );
};

export const CardSuggestion = ({ title }: CardSuggestionProps) => {
  return (
    <div className="bg-gray-100 dark:bg-[#2a2b32] rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition duration-200 cursor-pointer">
      <p className="text-sm font-medium text-gray-800 dark:text-white">
        {title}
      </p>
    </div>
  );
};

export default CardStat;
