import StateCard from "./StateCard";

const StateGrid = ({ portalList = [] }) => {

  return (
    <div className="state-grid">
      {portalList.map((portal) => (
        <StateCard
          key={portal?.portal_id}
          portal={portal}
        />
      ))}
    </div>
  );
};

export default StateGrid;
