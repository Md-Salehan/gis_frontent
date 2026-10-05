// testData.js
export const testData = {
  target_cities: {
    layerId: "target_cities_layer",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
          properties: {
            city_id: "NYC",
            city_name: "New York",
            population: 8000000,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
          properties: {
            city_id: "LAX",
            city_name: "Los Angeles",
            population: 4000000,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [2, 2],
          },
          properties: {
            city_id: "CHI",
            city_name: "Chicago",
            population: 2700000,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [3, 3],
          },
          properties: {
            city_id: "HOU",
            city_name: "Houston",
            population: 2300000,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [4, 4],
          },
          properties: {
            city_id: "PHX",
            city_name: "Phoenix",
            population: 1600000,
          },
        },
      ],
    },
    metaData: {
      layer: {
        layer_nm: "Target Cities",
        original_layer: "target_cities",
        original_layer_nm: "Target Cities",
        created: new Date().toISOString(),
        type: "centroid_result",
      },
      style: {
        geom_typ: "P", // Point layer
      },
    },
  },

  join_city_stats: {
    layerId: "join_city_stats_layer",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
          properties: {
            city_code: "NYC",
            median_income: 65000,
            unemployment_rate: 4.2,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
          properties: {
            city_code: "LAX",
            median_income: 58000,
            unemployment_rate: 5.1,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [2, 2],
          },
          properties: {
            city_code: "CHI",
            median_income: 55000,
            unemployment_rate: 5.8,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [3, 3],
          },
          properties: {
            city_code: "HOU",
            median_income: 52000,
            unemployment_rate: 4.9,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [4, 4],
          },
          properties: {
            city_code: "PHX",
            median_income: 50000,
            unemployment_rate: 5.5,
          },
        },
      ],
    },
    metaData: {
      layer: {
        layer_nm: "Join of City Statistics",
        original_layer: "join_city_stats",
        original_layer_nm: "City Statistics",
        created: new Date().toISOString(),
        type: "centroid_result",
      },
      style: {
        geom_typ: "P", // Point layer
      },
    },
  },

  target_no_match: {
    layerId: "target_no_match_layer",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
          properties: {
            id: "A1",
            name: "Alpha",
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
          properties: {
            id: "A2",
            name: "Beta",
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [2, 2],
          },
          properties: {
            id: "A3",
            name: "Gamma",
          },
        },
      ],
    },
    metaData: {
      layer: {
        layer_nm: "Target No Match",
        original_layer: "target_no_match",
        original_layer_nm: "Target No Match",
        created: new Date().toISOString(),
        type: "centroid_result",
      },
      style: {
        geom_typ: "P", // Point layer
      },
    },
  },

  join_no_match: {
    layerId: "join_no_match_layer",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
          properties: {
            code: "X1",
            value: 100,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
          properties: {
            code: "X2",
            value: 200,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [2, 2],
          },
          properties: {
            code: "X3",
            value: 300,
          },
        },
      ],
    },
    metaData: {
      layer: {
        layer_nm: "Join No Match",
        original_layer: "join_no_match",
        original_layer_nm: "Join No Match",
        created: new Date().toISOString(),
        type: "centroid_result",
      },
      style: {
        geom_typ: "P", // Point layer
      },
    },
  },
};
