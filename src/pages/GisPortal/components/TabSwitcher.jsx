import React, { useState } from "react";
import { Segmented } from "antd";
// import "./TabSwitcher.css";

const TabSwitcher = () => {
  const [selected, setSelected] = useState("State");

  return (
    <div className="tab-switcher">
      <Segmented
        size="large"
        options={["State", "Union Territories"]}
        value={selected}
        onChange={setSelected}
      />
    </div>
  );
};

export default TabSwitcher;
