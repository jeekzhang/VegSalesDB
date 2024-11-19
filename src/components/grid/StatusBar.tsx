import { CustomStatusPanelProps } from "@ag-grid-community/react";
import React, { useEffect, useState } from "react";

const StatusBar = (props: CustomStatusPanelProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(props.api.getDisplayedRowCount());
  }, []);

  return (
    <div className="ag-status-name-value">
      <span className="component">Row Count Component&nbsp;</span>
      <span className="ag-status-name-value-value">{count}</span>
    </div>
  );
};

StatusBar.displayName = "StatusBar";
export default StatusBar;
