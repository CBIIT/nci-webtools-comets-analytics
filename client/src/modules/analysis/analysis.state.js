import { atom } from "recoil";

export const loadingState = atom({
  key: "analysis.loadingState",
  default: false,
});

export const integrityCheckResultsState = atom({
  key: "analysis.integrityCheckResultsState",
  default: null,
});

export const modelResultsState = atom({
  key: "analysis.modelResultsState",
  default: null,
});

export const activeResultsTabState = atom({
  key: "analysis.activeResultsTabState",
  default: "integrityCheckResults",
});
