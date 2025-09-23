import Plot from "react-plotly.js";
import type { Data } from "plotly.js";

export type PlotlySpec = {
  data: Data[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

export type ChartItem =
  | { html: string }
  | { data_uri: string; plotly?: PlotlySpec }
  | { plotly: PlotlySpec; data_uri?: string };

export default function ChartGallery({ charts }: { charts: ChartItem[] }) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="space-y-6">
      {charts.map((c, idx) => {
        const key = `chart-${idx}`;

        // HTML chart
        if ("html" in c && typeof c.html === "string") {
          return (
            <div key={key} className="w-full">
              <iframe
                srcDoc={c.html}
                title={key}
                className="w-full"
                style={{
                  height: "clamp(320px, 60vh, 640px)",
                  border: "none",
                  overflow: "hidden",
                }}
              />
              <hr className="border-t border-gray-700 my-6 opacity-50" />
            </div>
          );
        }

        // Plotly
        if ("plotly" in c && c.plotly) {
          const p: PlotlySpec = c.plotly;
          return (
            <div key={key} className="w-full">
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
                style={{ width: "100%", height: "clamp(320px, 60vh, 640px)" }}
                useResizeHandler
              />
              <hr className="border-t border-gray-700 my-6 opacity-50" />
            </div>
          );
        }

        // Image
        if ("data_uri" in c && c.data_uri) {
          return (
            <div key={key} className="w-full">
              <img
                src={c.data_uri}
                alt={key}
                className="w-full rounded object-contain"
              />
              <hr className="border-t border-gray-700 my-6 opacity-50" />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
