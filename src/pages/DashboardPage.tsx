import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import CardStat from "../components/SupportComponents/Card";
import ChartGallery from "../components/ChatComponents/ChartGallery";
import {
  askDataset,
  type AskResult,
  type ChartItem,
} from "../utils/askDataset";
import { generateQuestionFromColumnName } from "../utils/generateQuestionFromColumnName";

type KPIItem = {
  key: string;
  label: string;
  unit?: string;
};

type CardStatItem = {
  title: string;
  value: string | number;
  change: string;
  type: "users" | "revenue" | "conversion" | "order";
};

function getKpiType(key: string): CardStatItem["type"] {
  const lower = key.toLowerCase();
  if (lower.includes("user")) return "users";
  if (lower.includes("revenue") || lower.includes("cpa")) return "revenue";
  if (
    lower.includes("conversion") ||
    lower.includes("ctr") ||
    lower.includes("retention")
  )
    return "conversion";
  return "order";
}

const DashboardPage: React.FC = () => {
  const { section } = useParams();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<CardStatItem[]>([]);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [analysis, setAnalysis] = useState<string>("");
  const [loadingChart, setLoadingChart] = useState(false);
  const [parsedKpis, setParsedKpis] = useState<KPIItem[]>([]); // untuk mapping saat klik

  const handleNewChat = () => {
    navigate(`/domain/${section}/dashboard/newchat`);
  };

  useEffect(() => {
    if (!section) return;

    const raw = localStorage.getItem(`config_selected_kpis_${section}`);
    if (!raw) return;

    try {
      const parsed: KPIItem[] = JSON.parse(raw);
      setParsedKpis(parsed);

      const mapped = parsed.map((kpi) => ({
        title: kpi.label,
        value: Math.floor(Math.random() * 1000),
        change: Math.random() > 0.5 ? "+4%" : "-3%",
        type: getKpiType(kpi.key),
      }));
      setKpis(mapped);

      // Ambil chart dari KPI pertama
      const first = parsed[0];
      if (first && first.key.startsWith("column:")) {
        const parts = first.key.split(":");
        const datasetId = parts[1];
        const columnName = parts.slice(2).join(":");
        fetchChartAndAnalysis(datasetId, columnName);
      }
    } catch (err) {
      console.error("Failed to parse KPIs", err);
    }
  }, [section]);

  async function fetchChartAndAnalysis(datasetId: string, columnName: string) {
    setLoadingChart(true);
    try {
      const question = generateQuestionFromColumnName(columnName);
      const result: AskResult = await askDataset(datasetId, question);
      setCharts(result.charts || []);
      setAnalysis(result.analysis || "");
    } catch (err) {
      console.error("Gagal ambil chart/analysis:", err);
      setCharts([]);
      setAnalysis("Gagal memuat analisis.");
    } finally {
      setLoadingChart(false);
    }
  }

  return (
    <div className="relative min-h-screen p-6 bg-[#1a1b1e] text-white">
      <h2 className="text-2xl font-bold mb-4">Dashboard {section}</h2>

      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {kpis.map((kpi, idx) => (
            <CardStat
              key={idx}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              type={kpi.type}
              onClick={() => {
                const selected = parsedKpis.find((x) => x.label === kpi.title);
                if (selected?.key?.startsWith("column:")) {
                  const parts = selected.key.split(":");
                  const datasetId = parts[1];
                  const columnName = parts.slice(2).join(":");
                  fetchChartAndAnalysis(datasetId, columnName);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Chart + Analysis */}
      {loadingChart ? (
        <div className="text-gray-400">Loading chart & analysis...</div>
      ) : (
        <>
          {charts.length > 0 && (
            <section className="mt-6 space-y-4">
              <h3 className="text-white text-lg font-semibold">Chart</h3>
              <ChartGallery charts={charts} />
            </section>
          )}
          {analysis && (
            <section className="mt-6 space-y-2">
              <h3 className="text-white text-lg font-semibold">
                Descriptive Analysis
              </h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {analysis}
              </p>
            </section>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleNewChat}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg transition"
      >
        <FiPlus size={20} />
        <span>New Chat</span>
      </button>
    </div>
  );
};

export default DashboardPage;
