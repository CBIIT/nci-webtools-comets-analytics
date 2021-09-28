import groupBy from "lodash/groupBy";
import zipObject from "lodash/zipObject";

export function parseValue(value) {
  const stringValue = String(value).trim();
  if (["", "NULL", "NA"].includes(stringValue)) return null;
  else if (["TRUE", "T"].includes(stringValue)) return true;
  else if (["FALSE", "F"].includes(stringValue)) return false;
  else if (!isNaN(+stringValue)) return +stringValue;
  else if (/c\(.*\)/.test(stringValue)) return parseVector(stringValue);
  else if (/list\(.*\)/.test(stringValue)) return parseList(stringValue);
  return stringValue;
}

export function parseVector(listString) {
  return listString
    .match(/c\((.*)\)/)[1]
    .split(",")
    .map(parseValue);
}

export function parseList(listString) {
  return listString
    .match(/list\((.*)\)/)[1]
    .split(",")
    .reduce((list, item) => {
      const [_, name, value] = item.trim().split(/(.+)=(.+)/);
      const rName = name.trim();
      const rValue = parseValue(value);
      list[rName] = rValue;
      return list;
    }, {});
}

export function parseModelSpecifiers(modelOptionRows) {
  const optionRowsGroupedByModelSpecifier = groupBy(
    modelOptionRows,
    "modelspec"
  );
  let modelSpecifierOptions = [];

  for (const [modelSpecifier, optionRows] of Object.entries(
    optionRowsGroupedByModelSpecifier
  )) {
    // determine model function (lm, glm, or correlation)
    const model = optionRows.find((row) => row["function"])?.function;

    // determine model options (specific to model function)
    const modelOptions = zipObject(
      optionRows.map((o) => o.option),
      optionRows.map((o) => parseValue(o.value))
    );

    // remove empty entries
    delete modelOptions[""];

    // append model function and model options to list
    modelSpecifierOptions.push({
      name: modelSpecifier,
      model,
      modelOptions,
    });
  }

  // note that ModelChecks and ModelOutput options are applied globally
  return modelSpecifierOptions;
}