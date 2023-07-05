import { parseModelTypes } from "../modules/analysis/results/parse-input";

async function parseResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    // attempt to parse as html if json parsing fails (domparser treats plain strings as body text)
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const body = doc?.documentElement?.innerText || data;
    data = { error: body };
  }
  if (!response.ok) {
    const message = data.message || data.error || text;
    throw new Error(message);
  }
  return data;
}

export async function getCohorts() {
  const response = await fetch("api/cohorts");
  return await parseResponse(response);
}

export async function getIntegrityCheckResults(params) {
  const response = await fetch("api/loadFile", {
    method: "POST",
    body: params,
  });
  const results = await parseResponse(response);
  results.modelTypes = parseModelTypes(results.options);
  return results;
}

export async function getModelResults(params) {
  const response = await fetch("api/runModel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return await parseResponse(response);
}
