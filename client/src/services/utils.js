export function debounce(callback, interval) {
  let id;
  return function () {
    if (id) clearTimeout(id);
    id = setTimeout(callback.bind(this, ...arguments), interval);
  };
}

export function withinValuesByKey(values, key = "value") {
  return (option) => (values || []).map((o) => o[key]).includes(option[key]);
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`;
}

export function toCSV({
  columns,
  rows,
  recordDelimiter = ",",
  lineDelimiter = "\r\n",
}) {
  // use rfc4180 as a reference

  // do nothing if no columns or records are specified
  if (!columns || !columns.length || !rows || !rows.length) return;

  // leave numbers as-is, replace nulls/undefined with empty strings
  // and wrap strings in double quotes (while escaping quotes within records)
  const asRecord = (value) =>
    typeof value === "number"
      ? value
      : value
      ? `"${String(value).replace(/"/g, '""')}"`
      : "";

  return [
    columns.map(asRecord).join(recordDelimiter),
    ...rows.map((row) =>
      columns
        .map((column) => row[column])
        .map(asRecord)
        .join(recordDelimiter)
    ),
  ].join(lineDelimiter);
}
