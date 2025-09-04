// src/utils/useSectionFromPath.ts
import { useLocation } from "react-router-dom";

export default function useSectionFromPath() {
  const { pathname } = useLocation();
  const m = pathname.match(/^\/domain\/([^/]+)/);
  return m?.[1] ?? "";
}
