import { RangeFilter, TextFilter } from "../../common/table";

export const correlationSummaryColumns = [
  {
    id: "run",
    accessor: "run",
    Filter: TextFilter,
    width: 120,

  },
  {
    id: "cohort",
    accessor: "cohort",
    Filter: TextFilter,
  },
  {
    id: "runmode",
    accessor: "runmode",
    Filter: TextFilter,
  },
  {
    id: "model",
    accessor: "model",
    Filter: TextFilter,
  },
  {
    id: "outcomespec",
    accessor: "outcomespec",
    Filter: TextFilter,
  },
  {
    id: "exposurespec",
    accessor: "exposurespec",
    Filter: TextFilter,
  },
  {
    id: "term",
    accessor: "term",
    Filter: TextFilter,
  },
  {
    id: "nobs",
    accessor: "nobs",
    Filter: TextFilter,
  },
  {
    id: "message",
    accessor: "message",
    Filter: TextFilter,
  },
  {
    id: "adjvars",
    accessor: "adjvars",
    Filter: TextFilter,
  },
  {
    id: "adjvars.remove",
    accessor: "adjvars.remove",
    Filter: TextFilter,
  },
  {
    id: "adjspec",
    accessor: "adjspec",
    Filter: TextFilter,
  },
  {
    id: "outcome_uid",
    accessor: "outcome_uid",
    Filter: TextFilter,
  },
  {
    id: "outcome",
    accessor: "outcome",
    Filter: TextFilter,
  },
  {
    id: "exposure_uid",
    accessor: "exposure_uid",
    Filter: TextFilter,
  },
  {
    id: "exposure",
    accessor: "exposure",
    Filter: TextFilter,
  },
  {
    id: "adj_uid",
    accessor: "adj_uid",
    Filter: TextFilter,
  },
  {
    id: "model_function",
    accessor: "model_function",
    Filter: TextFilter,
  }
];

export const correlationEffectsColumns = [
  {
    id: "run",
    accessor: "run",
    Filter: TextFilter,
    width: 120,
  },
  {
    id: "outcomespec",
    accessor: "outcomespec",
    Filter: TextFilter,
    width: 300,
  },
  {
    id: "exposurespec",
    accessor: "exposurespec",
    Filter: TextFilter,
  },
  {
    id: "term",
    accessor: "term",
    Filter: TextFilter,
  },
  {
    id: "corr",
    accessor: "corr",
    Filter: RangeFilter,
    filter: "between"
  },
  {
    id: "pvalue",
    accessor: "pvalue",
    Filter: RangeFilter,
    filter: "between"
  }
]