import React from "react";
import LogicFlow from "@logicflow/core";
import "@logicflow/core/dist/style/index.css";

import logo from "./logo.svg";
import "./App.css";

class App extends React.Component {
  componentDidMount() {
    const data = {
      // 节点
      nodes: [
        {
          id: 50,
          type: "rect",
          x: 100,
          y: 150,
          text: "你好",
        },
        {
          id: 21,
          type: "circle",
          x: 300,
          y: 150,
        },
      ],
      // 边
      edges: [
        {
          type: "polyline",
          sourceNodeId: 50,
          targetNodeId: 21,
        },
      ],
    };

    const lf = new LogicFlow({
      container: document.querySelector("#container"),
      stopScrollGraph: true,
      stopZoomGraph: true,
      grid: {
        type: "dot",
        size: 20,
      },
    });

    lf.render(data);

    setTimeout(() => {
      console.log(lf.getGraphData());
    }, 5000);
  }
  render() {
    return (
      <div className="App">
        <div id="container"></div>
      </div>
    );
  }
}

export default App;
