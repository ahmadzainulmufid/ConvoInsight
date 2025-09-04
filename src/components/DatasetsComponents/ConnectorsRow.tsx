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

const ConnectorsRow: React.FC = () => {
  const section = useSectionFromPath();

  // fallback kalau section kosong (misalnya user langsung ke /connect)
  const connectUrl = section
    ? `/domain/${section}/datasets/connect`
    : "/connect";

  return (
    <div className="mt-6">
      <div className="rounded-xl border-2 border-dashed border-[#3a3b42] bg-[#1f2024] p-6 text-center">
        <div className="flex items-center justify-center flex-wrap gap-6 text-2xl">
          <SiMysql title="MySQL" className="text-[#4479A1]" />
          <SiPostgresql title="PostgreSQL" className="text-[#336791]" />
          <SiSupabase title="Supabase" className="text-[#3ECF8E]" />
          <SiSnowflake title="Snowflake" className="text-[#29B5E8]" />
          <SiSalesforce title="Salesforce" className="text-[#00A1E0]" />
        </div>
        <p className="mt-4 text-gray-300">
          <Link
            to={connectUrl}
            className="text-inherit underline underline-offset-2 hover:text-gray-200"
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
