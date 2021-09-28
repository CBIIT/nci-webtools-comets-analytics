import { parseModelSpecifiers } from "../modules/analysis/results/parse-input";

export async function getCohorts() {
  const response = await fetch("api/cohorts");
  return await response.json();
}

export async function getIntegrityCheckResults(params) {
  const response = await fetch("api/loadFile", {
    method: "POST",
    body: params,
  });
  const results = await response.json();
  results.modelSpecifiers = parseModelSpecifiers(results.options);
  return results;
}

export async function getModelResults(params) {
  const response = await fetch("api/runModel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return await response.json();
}
