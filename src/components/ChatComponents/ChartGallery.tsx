import Plot from "react-plotly.js";
import type { ChartItem, PlotlySpec } from "../../utils/askDataset";

export default function ChartGallery({ charts }: { charts: ChartItem[] }) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid gap-4">
      {charts.map((c, idx) => {
        const key = `${c.title}-${idx}`;

        // --- case plotly
        if ("plotly" in c && c.plotly) {
          const p: PlotlySpec = c.plotly;
          return (
            <div
              key={key}
              className="rounded-md bg-[#24252c] border border-[#2F3038] p-3"
            >
              <div className="text-sm mb-2 text-gray-200">{c.title}</div>
              <Plot
                data={p.data}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#e5e7eb" },
                  margin: { t: 28, r: 10, b: 40, l: 50 },
                  ...p.layout,
                }}
                config={{ displaylogo: false, responsive: true, ...p.config }}
                style={{ width: "100%", height: "360px" }}
                useResizeHandler
              />
            </div>
          );
        }

        // --- case image
        if ("data_uri" in c && c.data_uri) {
          return (
            <div
              key={key}
              className="rounded-md bg-[#24252c] border border-[#2F3038] p-3"
            >
              <div className="text-sm mb-2 text-gray-200">{c.title}</div>
              <img
                src={c.data_uri}
                alt={c.title}
                className="max-w-full rounded"
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
