import { groupBy, pick, cloneDeep, chunk, uniq, map } from "lodash";

const defaultPlot = {
  data: [],
  layout: [],
};

const defaultConfig = {
  displayModeBar: true,
  toImageButtonOptions: {
    format: "svg",
    filename: "plot_export",
    height: 1600,
    width: 1600,
    scale: 1,
  },
  displaylogo: false,
};

export function sampleChunks(values, interval) {
  const chunkSize = Math.floor(values?.length / interval) || 1;
  return chunk(values, chunkSize).map((e) => e[0]);
}

export function getHeatmapPlot(results, heatmapOptions, modelOptions) {
  if (!results || !results.heatmap || !results.heatmap.data || !results.heatmap.data.length) {
    return defaultPlot;
  }

  const { xKey, yKey, zKey, sortColumn, pValueMin, pValueMax } = heatmapOptions;
  const { name } = modelOptions;

  let records = (cloneDeep(results?.Effects) || []).filter(({ pvalue }) => {
    if (pValueMin !== "" && pValueMax !== "" && !isNaN(pValueMin) && !isNaN(pValueMax)) {
      return +pvalue >= +pValueMin && pvalue <= +pValueMax;
    } else if (pValueMin !== "" && !isNaN(+pValueMin)) {
      return +pvalue >= +pValueMin;
    } else if (pValueMax !== "" && !isNaN(+pValueMax)) {
      return +pvalue <= +pValueMax;
    }
    return true;
  });

  if (!records.length) {
    return defaultPlot;
  }

  const xCategories = uniq(map(records, xKey));
  const recordsGroupedByY = groupBy(records, yKey);
  const xCategoriesSorted = cloneDeep(xCategories).sort();
  const matchesSortColumn = (record) => record[xKey] === (sortColumn || xCategories[0]);
  const yCategoriesSorted = Object.entries(recordsGroupedByY)
    .sort((a, b) => {
      const recordA = a[1].find(matchesSortColumn);
      const recordB = b[1].find(matchesSortColumn);
      return recordA && recordB ? recordA[zKey] - recordB[zKey] : 0;
    })
    .map(([key]) => key);

  const values = yCategoriesSorted.map((y) =>
    xCategoriesSorted.map((x) => {
      let record = records.find((e) => e[xKey] === x && e[yKey] === y);
      return record ? record[zKey] : null;
    })
  );

  const customValues = yCategoriesSorted.map((y) =>
    xCategoriesSorted.map((x) => {
      let record = records.find((e) => e[xKey] === x && e[yKey] === y);
      return record || { pvalue: NaN };
    })
  );

  return {
    data: [
      {
        x: xCategoriesSorted,
        y: yCategoriesSorted,
        z: values,
        customdata: customValues,
        type: "heatmap",
        hovertemplate: [
          `<b>Exposure</b>: %{x}`,
          `<b>Outcome</b>: %{y}`,
          `<b>Estimate</b>: %{z}`,
          `<b>P-value</b>: %{customdata.pvalue}`,
          "<extra></extra>",
        ].join("<br>"),
        colorbar: {
          title: {
            text: "Estimate",
          },
        },
      },
    ],
    layout: {
      title: name,
      annotations: heatmapOptions.showAnnotations
        ? records.map((r) => ({
            x: r[xKey],
            y: r[yKey],
            text: r[zKey],
            xref: "x",
            yref: "y",
            showarrow: false,
          }))
        : [],
      xaxis: {
        automargin: true,
      },
      yaxis: {
        automargin: true,
      },
    },
    config: defaultConfig,
  };
}

export function getHeatmapDendrogramPlot(results, heatmapOptions, modelOptions) {
  if (
    !results ||
    !results.heatmap ||
    !results.heatmap.data ||
    !results.heatmap.dendrogram ||
    !results.heatmap.data.length
  ) {
    return defaultPlot;
  }

  const { name } = modelOptions;

  const defaultInterval = 40;
  const hcluster = cloneDeep(results?.heatmap?.dendrogram);
  const hclusterLayoutProps = [
    "anchor",
    "automargin",
    "autorange",
    "domain",
    "range",
    "categoryarray",
    "categoryorder",
    "showgrid",
    "showline",
    "showticklabels",
    "tickcolor",
    "ticklen",
    "tickmode",
    "ticks",
    "tickwidth",
    "type",
  ];
  const hclusterHeatmapTrace = hcluster?.data.find((t) => t.type === "heatmap");
  let hclusterAnnotations = [];

  if (hclusterHeatmapTrace) {
    for (let y = 0; y < hclusterHeatmapTrace.y.length; y++) {
      for (let x = 0; x < hclusterHeatmapTrace.x.length; x++) {
        hclusterAnnotations.push({
          x: hclusterHeatmapTrace.x[x],
          y: hclusterHeatmapTrace.y[y],
          text: hclusterHeatmapTrace.z[y][x],
          xref: "x",
          yref: "y2",
          showarrow: false,
        });
      }
    }
  }

  return hcluster
    ? {
        data: hcluster.data
          .map((t) => {
            const props = pick(t, ["x", "y", "z", "type", "mode", "text", "hoverinfo", "xaxis", "yaxis"]);

            if (t.type === "scatter" && t.x && t.x.length >= 2) {
              return {
                ...props,
                showlegend: false,
              };
            } else if (t.type === "heatmap") {
              return {
                ...props,
                text: props.y.map((y, yIndex) =>
                  props.x.map((x, xIndex) => {
                    const xCategory = hcluster.layout.xaxis.categoryarray[x - 1];
                    const yCategory = hcluster.layout.yaxis2.categoryarray[y - 1];
                    const zValue = props.z[yIndex][xIndex];
                    return [
                      `<b>Exposure</b>: ${xCategory}`,
                      `<b>Outcome</b>: ${yCategory}`,
                      `<b>Estimate</b>: ${zValue}`,
                    ].join("<br>");
                  })
                ),
                colorbar: {
                  title: {
                    text: "Estimate",
                  },
                },
              };
            }

            return null;
          })
          .filter(Boolean),
        layout: {
          title: name,
          annotations: heatmapOptions.showAnnotations ? hclusterAnnotations : [],
          margin: hcluster.layout.margin,
          xaxis: {
            ...pick(hcluster.layout.xaxis, hclusterLayoutProps),
            tickvals: sampleChunks(hcluster.layout.xaxis.tickvals, defaultInterval),
            ticktext: sampleChunks(hcluster.layout.xaxis.ticktext, defaultInterval),
          },
          xaxis2: {
            ...pick(hcluster.layout.xaxis2, hclusterLayoutProps),
          },
          yaxis: {
            ...pick(hcluster.layout.yaxis, hclusterLayoutProps),
          },
          yaxis2: {
            ...pick(hcluster.layout.yaxis2, hclusterLayoutProps),
            tickvals: sampleChunks(hcluster.layout.yaxis2.tickvals, defaultInterval),
            ticktext: sampleChunks(hcluster.layout.yaxis2.ticktext, defaultInterval),
          },
        },
        config: defaultConfig,
      }
    : defaultPlot;
}

export function getHeatmapPlot2(heatmap, xSort, ySort) {
  if (!heatmap || !heatmap.data || !heatmap.data.length) {
    return {};
  }

  // const records = heatmap.data;

  // const lookup = records.reduce((acc, record) => {
  //   const row = record._row;
  //   for (let key in record) {

  //   }
  // });

  // const rows = data.map(d => d._row);
  // const columns = Objects.keys(data[0]).filter(k => k !== '_row');
  // const values = rows.map(row => columns.map(column => lookup[row][column]));
}
