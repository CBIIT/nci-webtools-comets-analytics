import Plotly from 'plotly.js/dist/plotly';
import createPlotlyComponent from 'react-plotly.js/factory';


console.log(Plotly);

// allow using custom callbacks for tickformat values
// Plotly.d3.locale = (locale) => {
//   var result = Plotly.d3.locale(locale);
//   result.numberFormat = (format) => {
//       return typeof format === "function"
//         ? format
//         : result.numberFormat
//   }
//   return result;
// }


export default createPlotlyComponent(Plotly);
