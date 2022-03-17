import { atom, selector } from "recoil";
import { integrityCheckResultsState } from "./analysis.state";
import { tagsState } from "./results/tag-manager.state";
import { getCohorts } from "../../services/query";

export const formValuesState = atom({
  key: "inputForm.formValuesState",
  default: {
    cohort: "Other/Undefined",
    inputFile: null,
    method: "allModels",
    selectedModelName: "",
    selectedModelType: "",
    email: "",
    modelType: "",
    modelName: "Unadjusted",
    showMetabolites: false,
    showPredefinedModelTypes: false,
    showCustomModelTypes: false,
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
  },
});

export const cohortsState = selector({
  key: "inputForm.cohortsState",
  get: getCohorts,
});

export const variablesState = selector({
  key: "inputForm.variablesState",
  get: ({ get }) => {
    const integrityCheckResults = get(integrityCheckResultsState);
    const tags = get(tagsState);

    if (integrityCheckResults && !integrityCheckResults.errors && !integrityCheckResults.error) {
      const asOption = (v) => ({ value: v, label: v });
      const { variables, metabolites } = integrityCheckResults;
      const variableOptions = [asOption("All metabolites"), ...variables.map(asOption)];
      const metaboliteOptions = metabolites.map((m) => ({ ...asOption(m.metabid), isMetabolite: true }));
      return [...tags, ...variableOptions, ...metaboliteOptions];
    }

    return [];
  },
});
