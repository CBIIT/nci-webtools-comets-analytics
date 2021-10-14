import { atom, selector } from "recoil";
import { getCohorts } from "../../services/query";

export const defaultFormValues = {
  cohort: "Other/Undefined",
  inputFile: null,
  method: "",
  selectedModelName: "",
  selectedModelType: "",
  email: "",
  modelType: "",
  modelName: "Unadjusted",
  showMetabolites: false,
  exposures: [],
  outcomes: [{ label: "All metabolites", value: "All metabolites" }],
  adjustedCovariates: [],
  strata: [],
  filterVariable: "",
  filterOperator: "",
  filterValue: "",
  filters: [
    {
      variable: "",
      operator: "",
      value: "",
    },
  ],
};

export const formValuesState = atom({
  key: "analysis.formValuesState",
  default: defaultFormValues,
});

export const heatmapOptionsState = atom({
  key: "analysis.heatmapOptionsState",
  default: {
    sortColumn: "",
    sortRow: "",
    xKey: "term",
    yKey: "outcomespec",
    zKey: "corr",
    showAnnotations: false,
    showDendrogram: false,
    pValueMin: "",
    pValueMax: "",
  },
});

export const cohortsState = selector({
  key: "analysis.cohortsState",
  get: getCohorts,
});

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

export const variablesState = selector({
  key: "analysis.variablesState",
  get: ({ get }) => {
    const integrityCheckResults = get(integrityCheckResultsState);

    if (
      integrityCheckResults &&
      !integrityCheckResults.errors &&
      !integrityCheckResults.error
    ) {
      const asOption = (v) => ({ value: v, label: v });
      const { variables, metabolites } = integrityCheckResults;

      return [{ value: "All metabolites", label: "All metabolites" }]
        .concat(variables.map(asOption))
        .concat(
          metabolites.map((m) => ({
            ...asOption(m.metabid),
            isMetabolite: true,
          }))
        );
    }

    return [];
  },
});

// export const tagsState = selector({

// })
