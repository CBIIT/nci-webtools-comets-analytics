import { groupBy, pick, cloneDeep, chunk, uniq, map } from "lodash";

export function sampleChunks(values, interval) {
  const chunkSize = Math.floor(values?.length / interval) || 1;
  return chunk(values, chunkSize).map(e => e[0])
}

export function getHeatmapPlot(results, heatmapOptions) {
  if (!results || !results.heatmap || !results.heatmap.data || !results.heatmap.data.length) {
    return {data: [], layout: {}};
  }

  const { xKey, yKey, zKey, sortColumn, sortRow } = heatmapOptions;

  const records = cloneDeep(results?.Effects) || [];
  const xCategories = uniq(map(records, xKey));
  const recordsGroupedByY = groupBy(records, yKey);
  const xCategoriesSorted = cloneDeep(xCategories).sort();
  const matchesSortColumn = record => record[xKey] === (sortColumn || xCategories[0]);
  const yCategoriesSorted = Object.entries(recordsGroupedByY).sort((a, b) => {
    const recordA = a[1].find(matchesSortColumn);
    const recordB = b[1].find(matchesSortColumn);
    return recordA && recordB ? recordA[zKey] - recordB[zKey] : 0
  }).map(([key]) => key);

  const values = yCategoriesSorted.map(y => xCategoriesSorted.map(x =>
    records.find(e => e[xKey] === x && e[yKey] === y)[zKey]
  ));

  return {
    data: [
      {
        x: xCategoriesSorted,
        y: yCategoriesSorted,
        z: values,
        type: 'heatmap',
      },
    ],
    layout: {
      annotations: heatmapOptions.showAnnotations ? records.map(r => ({
        x: r[xKey],
        y: r[yKey],
        text: r[zKey],
        xref: 'x',
        yref: 'y',
        showarrow: false,
      })) : [],
      xaxis: {
        automargin: true,
      },
      yaxis: {
        automargin: true,
      },
    }
  };
}


export function getHeatmapDendrogramPlot(results, heatmapOptions) {
  if (!results || !results.heatmap || !results.heatmap.data || !results.heatmap.dendrogram || !results.heatmap.data.length) {
    return {data: [], layout: {}};
  }

  const defaultInterval = 40;
  const hcluster = cloneDeep(results?.heatmap?.dendrogram);
  const hclusterLayoutProps =  [
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
  const hclusterHeatmapTrace = hcluster?.data.find(t => t.type === 'heatmap');
  let hclusterAnnotations = [];
  
  if (hclusterHeatmapTrace) {
    for (let y = 0; y < hclusterHeatmapTrace.y.length; y ++) {
      for (let x = 0; x < hclusterHeatmapTrace.x.length; x ++) {
        hclusterAnnotations.push({
          x: hclusterHeatmapTrace.x[x],
          y: hclusterHeatmapTrace.y[y],
          text: hclusterHeatmapTrace.z[y][x],
          xref: 'x',
          yref: 'y2',
          showarrow: false,
        })
      }
    }
  }

  return hcluster ? {
    data: hcluster.data.map(t => {
      const props = pick(t, ['x', 'y', 'z', 'type', 'mode', 'text', 'hoverinfo', 'xaxis', 'yaxis'])

      if (t.type === 'scatter' && t.x && t.x.length >= 2) {
        return {
          ...props,
          showlegend: false,
        }
      }

      else if (t.type === 'heatmap') {
        return props;
      }

      return null;
    }).filter(Boolean),
    layout: {
      annotations: heatmapOptions.showAnnotations ? hclusterAnnotations : [],
      margin: hcluster.layout.margin,
      xaxis: {
        ...pick(hcluster.layout.xaxis, hclusterLayoutProps),
        tickvals: sampleChunks(hcluster.layout.xaxis.tickvals, defaultInterval),
        ticktext: sampleChunks(hcluster.layout.xaxis.ticktext, defaultInterval),
      },
      xaxis2: {
        ...pick(hcluster.layout.xaxis2, hclusterLayoutProps)
      },
      yaxis: {
        ...pick(hcluster.layout.yaxis, hclusterLayoutProps)
      },
      yaxis2: {
        ...pick(hcluster.layout.yaxis2, hclusterLayoutProps),
        tickvals: sampleChunks(hcluster.layout.yaxis2.tickvals, defaultInterval),
        ticktext: sampleChunks(hcluster.layout.yaxis2.ticktext, defaultInterval),
      },
    }
  } : {data: [], layout: {}};

}

export function getHeatmapPlot2(heatmap, xSort, ySort) {
  if (!heatmap || !heatmap.data || !heatmap.data.length) {
    return {}
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