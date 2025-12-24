import React, { useEffect, useState } from "react";
import "./GisPortal.css";
import HeaderBar from "./components/HeaderBar";
import StateGrid from "./components/StateGrid";
import FooterBar from "./components/FooterBar";
import { useGetPortalsQuery } from "../../store/api/portalApi";
import { AutoComplete, Input } from "antd";
import { setPortalList } from "../../store/slices/portalSlice";
import { useDispatch } from "react-redux";

const GisPortal = () => {
  const dispatch = useDispatch();
  const { data: portalList = [], isLoading, error } = useGetPortalsQuery();
  const [filteredPortals, setFilteredPortals] = useState([]);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    document.title = "GIS Portal";
    if (portalList.length) {
      dispatch(setPortalList(portalList));
      setFilteredPortals(portalList);
    }
  }, [portalList]);

  const handleSearch = (value) => {
    const searchValue = value.toLowerCase();

    // Generate search options based on portal names and descriptions
    const searchOptions = portalList
      .filter(
        (portal) =>
          portal.portal_nm.toLowerCase().includes(searchValue) ||
          portal.portal_desc.toLowerCase().includes(searchValue)
      )
      .map((portal) => ({
        value: portal.portal_id,
        label: (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{portal.portal_nm}</span>
            <span>{portal.portal_desc}</span>
          </div>
        ),
      }));

    setOptions(searchOptions);

    // Filter the portalList for StateGrid
    const filtered = searchValue
      ? portalList.filter(
          (portal) =>
            portal.portal_nm.toLowerCase().includes(searchValue) ||
            portal.portal_desc.toLowerCase().includes(searchValue)
        )
      : portalList;

    setFilteredPortals(filtered);
  };

  const onSelect = (value) => {
    // Filter to show only the selected portal
    const selected = portalList.filter((portal) => portal.portal_id === value);
    setFilteredPortals(selected);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="gis-portal-container">
      <HeaderBar />
      <div className="search-container">
        <AutoComplete
          popupMatchSelectWidth={400}
          style={{ width: 400 }}
          options={options}
          onSelect={onSelect}
          onSearch={handleSearch}
        >
          <Input.Search
            size="large"
            placeholder="Search portals by name or description"
            enterButton
          />
        </AutoComplete>
      </div>
      <StateGrid portalList={filteredPortals} />
      <FooterBar />
    </div>
  );
};

export default GisPortal;
