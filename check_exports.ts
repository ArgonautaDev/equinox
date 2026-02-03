import * as P from 'react-resizable-panels';
console.log("Keys:", Object.keys(P));
try {
  console.log("PanelGroup:", P.PanelGroup);
} catch (e) {
  console.log("Error accessing PanelGroup");
}
