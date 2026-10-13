// src/components/DatasetsComponents/ConnectorsRow.tsx
import React from "react";
import {
  SiMysql,
  SiPostgresql,
  SiSnowflake,
  SiSalesforce,
  SiSupabase,
} from "react-icons/si";
import { Link } from "react-router-dom";
import useSectionFromPath from "../../utils/useSectionFromPath";

type ConnectorsRowProps = {
  className?: string;
};

const ConnectorsRow: React.FC<ConnectorsRowProps> = ({ className }) => {
  const section = useSectionFromPath();

  const connectUrl = section
    ? `/domain/${section}/datasets/connect`
    : "/connect";

  return (
    <div className={`mt-6 ${className || ""}`}>
      <div className="rounded-2xl border border-white/5 bg-[#151923] p-6 text-center shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-center flex-wrap gap-3 text-2xl [&>svg]:box-content [&>svg]:p-2.5 [&>svg]:rounded-xl [&>svg]:bg-white/5 [&>svg]:ring-1 [&>svg]:ring-inset [&>svg]:ring-white/10">
          <SiMysql title="MySQL" className="text-[#4479A1]" />
          <SiPostgresql title="PostgreSQL" className="text-[#336791]" />
          <SiSupabase title="Supabase" className="text-[#3ECF8E]" />
          <SiSnowflake title="Snowflake" className="text-[#29B5E8]" />
          <SiSalesforce title="Salesforce" className="text-[#00A1E0]" />
        </div>
        <p className="mt-5 text-sm text-gray-400">
          <Link
            to={connectUrl}
            className="font-semibold text-indigo-400 underline underline-offset-4 decoration-indigo-400/40 hover:text-indigo-300"
          >
            Click here
          </Link>{" "}
          to connect to a data source to create a new dataset
        </p>
      </div>
    </div>
  );
};

export default ConnectorsRow;
