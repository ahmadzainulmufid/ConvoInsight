import Plot from "react-plotly.js";
import type { Data } from "plotly.js";

export type PlotlySpec = {
  data: Data[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

export type ChartItem =
  | { title: string; html: string }
  | { title: string; data_uri: string; plotly?: PlotlySpec }
  | { title: string; plotly: PlotlySpec; data_uri?: string };

export default function ChartGallery({ charts }: { charts: ChartItem[] }) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid gap-4">
      {charts.map((c, idx) => {
        const key = `${("title" in c && c.title) || "chart"}-${idx}`;
        const heading = c.title || "Chart";

        // HTML chart (iframe srcDoc)
        if ("html" in c && typeof c.html === "string") {
          return (
            <div
              key={key}
              className="rounded-md bg-[#24252c] border border-[#2F3038] p-3 sm:p-4 w-full"
            >
              <div className="text-sm mb-2 text-gray-200">{heading}</div>
              <iframe
                srcDoc={c.html}
                title={heading}
                className="w-full rounded"
                style={{
                  height: "clamp(320px, 60vh, 640px)",
                  border: "none",
                  overflow: "hidden",
                }}
              />
            </div>
          );
        }

        // Plotly native
        if ("plotly" in c && c.plotly) {
          const p: PlotlySpec = c.plotly;
          return (
            <div
              key={key}
              className="rounded-md bg-[#24252c] border border-[#2F3038] p-3 sm:p-4 w-full"
            >
              <div className="text-sm mb-2 text-gray-200">{heading}</div>
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
            </div>
          );
        }

        // Static image chart
        if ("data_uri" in c && c.data_uri) {
          return (
            <div
              key={key}
              className="rounded-md bg-[#24252c] border border-[#2F3038] p-3 sm:p-4 w-full"
            >
              <div className="text-sm mb-2 text-gray-200">{heading}</div>
              <img
                src={c.data_uri}
                alt={heading}
                className="w-full rounded object-contain"
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
