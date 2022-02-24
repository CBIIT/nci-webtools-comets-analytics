import { utils, writeFile } from "xlsx";

export function downloadTables(sheets, filename = "export.xlsx") {
  let workbook = utils.book_new();

  for (const { name, data } of sheets) {
    let sheet = utils.json_to_sheet(data);
    utils.book_append_sheet(workbook, sheet, name);
  }

  writeFile(workbook, filename);
}
