const getGeomFullForm = (geomTyp) => {
  switch (geomTyp) {
    case 'P':
        return 'Point';
    case 'L':
        return 'Line';
    case 'G':
        return 'Polygon';   
    default:
        return 'Unknown';
  } 
};

export default getGeomFullForm;