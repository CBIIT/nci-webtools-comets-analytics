import { forwardRef, useEffect, useRef } from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Pagination from "react-bootstrap/Pagination";
import {
  useTable,
  useFilters,
  usePagination,
  useSortBy,
  useBlockLayout,
  useResizeColumns,
  useRowSelect,
} from "react-table";
import classNames from "classnames";

export function TextFilter({ column: { filterValue, setFilter, placeholder, aria } }) {
  return (
    <Form.Control
      value={filterValue || ""}
      onChange={(e) => setFilter(e.target.value || undefined)}
      placeholder={placeholder || `Search...`}
      aria-label={aria}
    />
  );
}

export function RangeFilter({ column: { filterValue = [], setFilter, minPlaceholder, maxPlaceholder, aria } }) {
  const asInputValue = (value) => (typeof value === "number" ? value : "");
  const getInputValue = ({ target: { value } }) => (value ? parseFloat(value, 10) : undefined);

  return (
    <InputGroup className="flex-nowrap">
      <Form.Control
        type="number"
        placeholder={minPlaceholder || "Min"}
        value={asInputValue(filterValue[0])}
        onChange={(e) => setFilter((old = []) => [getInputValue(e), old[1]])}
        aria-label={aria + " Min"}
      />
      <Form.Control
        type="number"
        placeholder={maxPlaceholder || "Max"}
        value={asInputValue(filterValue[1])}
        onChange={(e) => setFilter((old = []) => [old[0], getInputValue(e)])}
        aria-label={aria + " Max"}
      />
    </InputGroup>
  );
}

export const IndeterminateCheckbox = forwardRef(({ indeterminate, ...rest }, ref) => {
  const defaultRef = useRef();
  const resolvedRef = ref || defaultRef;

  useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return (
    <>
      <input type="checkbox" ref={resolvedRef} {...rest} />
    </>
  );
});

export default function Table({ columns, data, options, useColumnFilters, onSelect }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    rows,
    selectedFlatRows,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, selectedRowIds },
  } = useTable(
    {
      columns,
      data,
      ...options,
    },
    useFilters,
    useSortBy,
    usePagination,
    useBlockLayout,
    useResizeColumns,
    useRowSelect,
  );

  useEffect(() => {
    if (onSelect) {
      onSelect(selectedFlatRows);
    }
  }, [onSelect, selectedFlatRows]);

  return (
    <>
      <div className="table-responsive rounded shadow-sm">
        <div
          {...getTableProps()}
          className="table table-custom table-nowrap table-hover table-bordered table-striped"
          role="table"
        >
          <div className="thead table-light text-muted" role="thead">
            {headerGroups.map((headerGroup) => (
              <div {...headerGroup.getHeaderGroupProps()} className="tr border-bottom">
                {headerGroup.headers.map((column) => (
                  <div
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className={classNames(
                      "th text-truncate d-flex align-items-center h-100",
                      column.type === "selection" && "p-2 justify-content-center",
                    )}
                    role="th"
                  >
                    {column.type === "selection" ? column.render("Tag") : column.render("Header")}
                    {column.isSorted && (
                      <i
                        className={classNames(
                          "bi",
                          "text-primary",
                          "ms-1",
                          column.isSortedDesc ? "bi-sort-down" : "bi-sort-up",
                        )}
                      />
                    )}
                    <div
                      {...column.getResizerProps()}
                      className={classNames("column-resizer", column.isResizing && "is-resizing")}
                    />
                  </div>
                ))}
              </div>
            ))}
            {useColumnFilters &&
              headerGroups.map((headerGroup) => (
                <div {...headerGroup.getHeaderGroupProps()} className="tr">
                  {headerGroup.headers.map((column) => (
                    <div {...column.getHeaderProps()} className="td">
                      <div
                        className={classNames(
                          "d-flex align-items-center h-100",
                          column.type === "selection" && "justify-content-center",
                        )}
                      >
                        {column.canFilter
                          ? column.render("Filter")
                          : column.type === "selection"
                          ? column.render("Header")
                          : null}
                      </div>
                      <div
                        {...column.getResizerProps()}
                        className={classNames("column-resizer", column.isResizing && "is-resizing")}
                      />
                    </div>
                  ))}
                </div>
              ))}
          </div>

          <div {...getTableBodyProps()} className="tbody">
            {page.map((row) => {
              prepareRow(row);
              return (
                <div {...row.getRowProps()} className="tr">
                  {row.cells.map((cell) => (
                    <div
                      {...cell.getCellProps()}
                      className={classNames("td d-flex", cell.column.type === "selection" && "justify-content-center")}
                    >
                      {cell.render("Cell")}
                      <div
                        {...cell.column.getResizerProps()}
                        className={classNames("column-resizer", cell.column.isResizing && "is-resizing")}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between p-3">
        <div className="text-muted">
          Showing rows {(1 + pageIndex * pageSize).toLocaleString()}-
          {Math.min(rows.length, (pageIndex + 1) * pageSize).toLocaleString()} of {rows.length.toLocaleString()}
        </div>

        <div className="d-flex">
          <Form.Control
            as="select"
            className="me-2"
            name="select-page-size"
            aria-label="Select page size"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </Form.Control>

          <Pagination className="mb-0">
            <Pagination.First onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
              First
            </Pagination.First>
            <Pagination.Prev onClick={() => previousPage()} disabled={!canPreviousPage}>
              Previous
            </Pagination.Prev>
            <Pagination.Next onClick={() => nextPage()} disabled={!canNextPage}>
              Next
            </Pagination.Next>
            <Pagination.Last onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
              Last
            </Pagination.Last>
          </Pagination>
        </div>
      </div>
    </>
  );
}
