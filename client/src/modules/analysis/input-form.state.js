import { atom, selector } from "recoil";
import { integrityCheckResultsState } from "./analysis.state";
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

    if (integrityCheckResults && !integrityCheckResults.errors && !integrityCheckResults.error) {
      const asOption = (v) => ({ value: v, label: v });
      const { variables, metabolites } = integrityCheckResults;

      return [{ value: "All metabolites", label: "All metabolites" }].concat(variables.map(asOption)).concat(
        metabolites.map((m) => ({
          ...asOption(m.metabid),
          isMetabolite: true,
        })),
      );
    }

    return [];
  },
});

// export const tagsState = selector({

// })
