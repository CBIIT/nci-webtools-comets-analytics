import { atom } from "recoil";

export const defaultHeatmapOptions = {
  sortColumn: "",
  sortRow: "",
  xKey: "term",
  yKey: "outcomespec",
  zKey: "estimate",
  showAnnotations: false,
  showDendrogram: false,
  pValueMin: "",
  pValueMax: "",
};

export const heatmapOptionsState = atom({
  key: "heatmapResults.heatmapOptionsState",
  default: defaultHeatmapOptions,
});
