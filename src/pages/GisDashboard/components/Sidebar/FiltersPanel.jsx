import React, { memo, useCallback, useMemo } from "react";
import {
  Button,
  Input,
  Select,
  Tag,
  Slider,
  Radio,
  Space,
  Tooltip,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Option } = Select;

const FiltersPanel = memo(({ filters, setFilters }) => {
  // Memoized update function
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, [setFilters]);

  const { measureBy, areaSubdivision, excludePostal, ageRange, residentsOnly, gender, income } = filters;

  // Memoized event handlers
  const handleMeasureByChange = useCallback((value) => updateFilter("measureBy", value), [updateFilter]);
  const handleAreaSubdivisionChange = useCallback((value) => updateFilter("areaSubdivision", value), [updateFilter]);
  const handleAgeRangeChange = useCallback((value) => updateFilter("ageRange", value), [updateFilter]);
  const handleResidentsOnlyChange = useCallback((e) => updateFilter("residentsOnly", e.target.value === "residents"), [updateFilter]);
  const handleGenderChange = useCallback((value) => updateFilter("gender", value), [updateFilter]);
  const handleIncomeChange = useCallback((value) => updateFilter("income", value), [updateFilter]);

  const handleRemovePostal = useCallback((postalToRemove) => {
    updateFilter("excludePostal", excludePostal.filter(p => p !== postalToRemove));
  }, [excludePostal, updateFilter]);

  // Memoized postal tags
  const postalTags = useMemo(() => 
    excludePostal.map((p) => (
      <Tag
        key={p}
        closable
        onClose={() => handleRemovePostal(p)}
      >
        {p}
      </Tag>
    )),
    [excludePostal, handleRemovePostal]
  );

  const genderButtons = useMemo(() => 
    ["all", "male", "female"].map((g) => (
      <Button
        key={g}
        type={gender === g ? "primary" : "default"}
        onClick={() => handleGenderChange(g)}
      >
        {g.charAt(0).toUpperCase() + g.slice(1)}
      </Button>
    )),
    [gender, handleGenderChange]
  );

  return (
    <>
      {/* Measure By */}
      <div className="measure-row">
        <div className="measure-label">Measured at</div>
        <Space>
          <Button
            size="small"
            type={measureBy === "visits" ? "primary" : "default"}
            onClick={() => handleMeasureByChange("visits")}
          >
            Visits
          </Button>
          <Button
            size="small"
            type={measureBy === "visitors" ? "primary" : "default"}
            onClick={() => handleMeasureByChange("visitors")}
          >
            Visitors
          </Button>
        </Space>
      </div>

      {/* Area Subdivision */}
      <div className="field">
        <label>Area subdivisions</label>
        <Select
          value={areaSubdivision}
          onChange={handleAreaSubdivisionChange}
          style={{ width: "100%" }}
        >
          <Option value="postal">Postal codes</Option>
          <Option value="district">Districts</Option>
        </Select>
      </div>

      {/* Exclude postal codes */}
      <div className="field">
        <label>Exclude postal codes</label>
        <Input prefix={<SearchOutlined />} placeholder="Postal code number" />
        <div className="tag-row">
          {postalTags}
        </div>
      </div>

      {/* Age Group */}
      <div className="field">
        <label>Age group</label>
        <Slider 
          range 
          min={0} 
          max={100} 
          value={ageRange} 
          onChange={handleAgeRangeChange} 
        />
      </div>

      {/* Visitors */}
      <div className="field small-row">
        <label>Consider POI visitors</label>
        <Radio.Group
          value={residentsOnly ? "residents" : "all"}
          onChange={handleResidentsOnlyChange}
        >
          <Radio value="residents">Residents</Radio>
          <Radio value="all">All</Radio>
        </Radio.Group>
        <Tooltip title="Inclusion of locals, guests, workers">
          <span className="info-dot">i</span>
        </Tooltip>
      </div>

      {/* Gender */}
      <div className="field">
        <label>Gender</label>
        <Space>
          {genderButtons}
        </Space>
      </div>

      {/* Income */}
      <div className="field">
        <label>Household income</label>
        <Slider 
          range 
          min={0} 
          max={10000} 
          value={income} 
          onChange={handleIncomeChange} 
        />
      </div>

      <div className="controls-actions">
        <Button type="primary">Apply</Button>
        <Button>Clear</Button>
      </div>
    </>
  );
});

FiltersPanel.displayName = 'FiltersPanel';
export default FiltersPanel;