// import { createContext, useContext, useState } from "react";

// type Ctx = {
//   datasetReady: boolean;
//   setDatasetReady: (v: boolean) => void;
// };

// const DatasetContext = createContext<Ctx | null>(null);

// export function DatasetProvider({ children }: { children: React.ReactNode }) {
//   const [datasetReady, setDatasetReady] = useState(false); // default: belum siap
//   return (
//     <DatasetContext.Provider value={{ datasetReady, setDatasetReady }}>
//       {children}
//     </DatasetContext.Provider>
//   );
// }

// // eslint-disable-next-line react-refresh/only-export-components
// export function useDataset() {
//   const ctx = useContext(DatasetContext);
//   if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
//   return ctx;
// }
