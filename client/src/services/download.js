import XLSX from 'xlsx';
export function downloadTables(sheets, filename = 'export.xlsx') {
  let workbook = XLSX.utils.book_new();
  
  for (const {name, data} of sheets) {
    let sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }

  XLSX.writeFile(workbook, filename);
}