/**
 * Serializes an object as a query string
 * @param {object} obj
 */
export function asQueryString(obj) {
  const query = [];
  for (let key in obj) {
    let value = obj[key];

    // treat arrays as comma-delineated lists
    if (Array.isArray(value)) value = value.join(",");

    // exclude undefined, null, or false values
    if (![undefined, null, false, ""].includes(value))
      query.push([key, value].map(encodeURIComponent).join("="));
  }
  return "?" + query.join("&");
}

export async function fetchJSON(url, params) {
  const response = await fetch(url, {
    ...params,
    headers: {
      ...(params ? params.headers : null),
      "Content-Type": "application/json",
      Accept: "applciation/json",
    },
  });

  const output = await response.json();

  if (response.ok) {
    return output;
  } else {
    throw new Error(output);
  }
}

export function query(url, params, fetchParams) {
  return fetchJSON(`${url}${asQueryString(params)}`, fetchParams);
}

export async function getCohorts() {
  const response = await fetch("api/cohorts");
  return await response.json();
}

/**
 *
 * @param {string} cohort
 * @param {File} inputFile
 */
export async function getIntegrityCheckResults(params) {
  const response = await fetch("api/loadFile", {
    method: "POST",
    body: params,
  });
  return await response.json();
}

/**
 *
 * @param {string} cohort
 * @param {File} inputFile
 */
export async function getModelResults(params) {
  const response = await fetch("api/runModel", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(params),
  });
  return await response.json();
}