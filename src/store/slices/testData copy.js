// testData.js
export const testData = {
  // === SCENARIO 1: Schools in Districts (Point → Polygon) ===
  schools: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3639, 22.5726] // Kolkata
        },
        properties: {
          school_id: "SCH001",
          name: "Kolkata High School",
          type: "Secondary",
          students: 1200,
          established: 1995,
          rating: 4.5
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.2683, 22.5895] // Howrah
        },
        properties: {
          school_id: "SCH002",
          name: "Howrah Academy",
          type: "Primary",
          students: 850,
          established: 2001,
          rating: 4.2
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.4364, 22.5432] // Salt Lake
        },
        properties: {
          school_id: "SCH003",
          name: "Salt Lake International",
          type: "International",
          students: 950,
          established: 2010,
          rating: 4.8
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3150, 22.4980] // Alipore
        },
        properties: {
          school_id: "SCH004",
          name: "Alipore Public School",
          type: "Secondary",
          students: 700,
          established: 1985,
          rating: 4.0
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.4050, 22.6120] // Barrackpore
        },
        properties: {
          school_id: "SCH005",
          name: "Barrackpore Central",
          type: "Secondary",
          students: 600,
          established: 2005,
          rating: 3.8
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.2900, 22.6200] // Serampore
        },
        properties: {
          school_id: "SCH006",
          name: "Serampore Mission School",
          type: "Primary",
          students: 450,
          established: 1960,
          rating: 4.3
        }
      }
    ]
  },

  districts: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.35, 22.55],
            [88.40, 22.55],
            [88.40, 22.60],
            [88.35, 22.60],
            [88.35, 22.55]
          ]]
        },
        properties: {
          district_id: "D001",
          name: "Kolkata",
          population: 4500000,
          area_sqkm: 185,
          density: 24324,
          development_index: 0.85
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.25, 22.57],
            [88.30, 22.57],
            [88.30, 22.62],
            [88.25, 22.62],
            [88.25, 22.57]
          ]]
        },
        properties: {
          district_id: "D002",
          name: "Howrah",
          population: 1500000,
          area_sqkm: 95,
          density: 15789,
          development_index: 0.72
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.42, 22.52],
            [88.47, 22.52],
            [88.47, 22.57],
            [88.42, 22.57],
            [88.42, 22.52]
          ]]
        },
        properties: {
          district_id: "D003",
          name: "North 24 Parganas",
          population: 2500000,
          area_sqkm: 280,
          density: 8928,
          development_index: 0.68
        }
      }
    ]
  },

  // === SCENARIO 2: Houses near Hospitals (Point → Point, Within Distance) ===
  houses: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3700, 22.5750]
        },
        properties: {
          house_id: "H001",
          address: "123 Park Street",
          bedrooms: 3,
          price: 8500000,
          year_built: 2015
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3650, 22.5800]
        },
        properties: {
          house_id: "H002",
          address: "45 Middleton Street",
          bedrooms: 2,
          price: 6500000,
          year_built: 2010
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3750, 22.5650]
        },
        properties: {
          house_id: "H003",
          address: "78 Camac Street",
          bedrooms: 4,
          price: 12000000,
          year_built: 2018
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3800, 22.5900]
        },
        properties: {
          house_id: "H004",
          address: "12 Shakespeare Sarani",
          bedrooms: 2,
          price: 7000000,
          year_built: 2012
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3550, 22.5850]
        },
        properties: {
          house_id: "H005",
          address: "90 Bidhan Sarani",
          bedrooms: 3,
          price: 9000000,
          year_built: 2016
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3850, 22.5700]
        },
        properties: {
          house_id: "H006",
          address: "34 Ballygunge Circular Road",
          bedrooms: 4,
          price: 15000000,
          year_built: 2020
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3600, 22.5600]
        },
        properties: {
          house_id: "H007",
          address: "56 Tollygunge Road",
          bedrooms: 3,
          price: 8000000,
          year_built: 2014
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3900, 22.5950]
        },
        properties: {
          house_id: "H008",
          address: "210 Salt Lake City",
          bedrooms: 2,
          price: 5500000,
          year_built: 2008
        }
      }
    ]
  },

  hospitals: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3720, 22.5720]
        },
        properties: {
          hospital_id: "HOS001",
          name: "Apollo Gleneagles",
          type: "Multi-Specialty",
          beds: 500,
          emergency: true,
          rating: 4.7
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3580, 22.5780]
        },
        properties: {
          hospital_id: "HOS002",
          name: "AMRI Hospital",
          type: "Multi-Specialty",
          beds: 350,
          emergency: true,
          rating: 4.5
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3780, 22.5550]
        },
        properties: {
          hospital_id: "HOS003",
          name: "Ruby General Hospital",
          type: "General",
          beds: 200,
          emergency: true,
          rating: 4.2
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3950, 22.5900]
        },
        properties: {
          hospital_id: "HOS004",
          name: "Salt Lake Hospital",
          type: "General",
          beds: 150,
          emergency: false,
          rating: 3.8
        }
      }
    ]
  },

  // === SCENARIO 3: Roads intersecting Rivers (Line → Line, Intersects) ===
  roads: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3600, 22.5400],
            [88.3700, 22.5500],
            [88.3800, 22.5600],
            [88.3900, 22.5700],
            [88.4000, 22.5800]
          ]
        },
        properties: {
          road_id: "R001",
          name: "National Highway 12",
          type: "Highway",
          lanes: 4,
          speed_limit: 80,
          length_km: 8.5
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3400, 22.5700],
            [88.3500, 22.5750],
            [88.3600, 22.5800],
            [88.3700, 22.5850]
          ]
        },
        properties: {
          road_id: "R002",
          name: "Grand Trunk Road",
          type: "Arterial",
          lanes: 6,
          speed_limit: 60,
          length_km: 5.2
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3800, 22.5400],
            [88.3850, 22.5550],
            [88.3900, 22.5700],
            [88.3950, 22.5850]
          ]
        },
        properties: {
          road_id: "R003",
          name: "Bypass Road",
          type: "Highway",
          lanes: 6,
          speed_limit: 70,
          length_km: 6.3
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3500, 22.5500],
            [88.3600, 22.5550],
            [88.3700, 22.5600],
            [88.3800, 22.5650]
          ]
        },
        properties: {
          road_id: "R004",
          name: "Park Street Road",
          type: "Local",
          lanes: 2,
          speed_limit: 40,
          length_km: 3.1
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3550, 22.5900],
            [88.3650, 22.5950],
            [88.3750, 22.6000],
            [88.3850, 22.6050]
          ]
        },
        properties: {
          road_id: "R005",
          name: "Lake Town Road",
          type: "Collector",
          lanes: 2,
          speed_limit: 50,
          length_km: 4.7
        }
      }
    ]
  },

  rivers: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3500, 22.5450],
            [88.3650, 22.5550],
            [88.3800, 22.5650],
            [88.3950, 22.5750],
            [88.4100, 22.5850]
          ]
        },
        properties: {
          river_id: "RIV001",
          name: "Hooghly River",
          length_km: 260,
          width_m: 500,
          type: "Major",
          water_quality: "Good"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3700, 22.5350],
            [88.3750, 22.5450],
            [88.3800, 22.5550],
            [88.3850, 22.5650]
          ]
        },
        properties: {
          river_id: "RIV002",
          name: "Adi Ganga",
          length_km: 40,
          width_m: 50,
          type: "Minor",
          water_quality: "Poor"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3450, 22.5800],
            [88.3550, 22.5850],
            [88.3650, 22.5900],
            [88.3750, 22.5950]
          ]
        },
        properties: {
          river_id: "RIV003",
          name: "Kulti River",
          length_km: 30,
          width_m: 30,
          type: "Minor",
          water_quality: "Moderate"
        }
      }
    ]
  },

  // === SCENARIO 4: Land Parcels Overlapping (Polygon → Polygon, Overlaps) ===
  land_parcels: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3650, 22.5650],
            [88.3750, 22.5650],
            [88.3750, 22.5750],
            [88.3650, 22.5750],
            [88.3650, 22.5650]
          ]]
        },
        properties: {
          parcel_id: "P001",
          owner: "Rajesh Kumar",
          area_sqft: 2500,
          zone: "Residential",
          land_value: 4500000,
          tax_assessed: 45000
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3700, 22.5700],
            [88.3800, 22.5700],
            [88.3800, 22.5800],
            [88.3700, 22.5800],
            [88.3700, 22.5700]
          ]]
        },
        properties: {
          parcel_id: "P002",
          owner: "Sneha Patel",
          area_sqft: 3200,
          zone: "Mixed Use",
          land_value: 6800000,
          tax_assessed: 68000
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3600, 22.5600],
            [88.3700, 22.5600],
            [88.3700, 22.5700],
            [88.3600, 22.5700],
            [88.3600, 22.5600]
          ]]
        },
        properties: {
          parcel_id: "P003",
          owner: "Amit Singh",
          area_sqft: 1800,
          zone: "Commercial",
          land_value: 8200000,
          tax_assessed: 82000
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3750, 22.5750],
            [88.3850, 22.5750],
            [88.3850, 22.5850],
            [88.3750, 22.5850],
            [88.3750, 22.5750]
          ]]
        },
        properties: {
          parcel_id: "P004",
          owner: "Priya Das",
          area_sqft: 2800,
          zone: "Residential",
          land_value: 5200000,
          tax_assessed: 52000
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3800, 22.5650],
            [88.3900, 22.5650],
            [88.3900, 22.5750],
            [88.3800, 22.5750],
            [88.3800, 22.5650]
          ]]
        },
        properties: {
          parcel_id: "P005",
          owner: "Vikram Mehta",
          area_sqft: 3500,
          zone: "Industrial",
          land_value: 3800000,
          tax_assessed: 38000
        }
      }
    ]
  },

  // === SCENARIO 5: Nearest Police Station (Point → Point, Nearest) ===
  police_stations: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3650, 22.5700]
        },
        properties: {
          station_id: "PS001",
          name: "Park Street Police Station",
          jurisdiction: "Zone 1",
          officers: 25,
          vehicles: 10
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3900, 22.5800]
        },
        properties: {
          station_id: "PS002",
          name: "Salt Lake Police Station",
          jurisdiction: "Zone 2",
          officers: 20,
          vehicles: 8
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3550, 22.5550]
        },
        properties: {
          station_id: "PS003",
          name: "Alipore Police Station",
          jurisdiction: "Zone 3",
          officers: 30,
          vehicles: 12
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [88.3800, 22.6000]
        },
        properties: {
          station_id: "PS004",
          name: "Barrackpore Police Station",
          jurisdiction: "Zone 4",
          officers: 18,
          vehicles: 6
        }
      }
    ]
  },

  // === SCENARIO 6: Touch Tests (Polygon → Polygon, Touches) ===
  city_wards: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3650, 22.5650],
            [88.3750, 22.5650],
            [88.3750, 22.5750],
            [88.3650, 22.5750],
            [88.3650, 22.5650]
          ]]
        },
        properties: {
          ward_id: "W001",
          name: "Ward 1 - Park Street",
          population: 15000,
          councillor: "John Doe",
          party: "Party A"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3750, 22.5650],
            [88.3850, 22.5650],
            [88.3850, 22.5750],
            [88.3750, 22.5750],
            [88.3750, 22.5650]
          ]]
        },
        properties: {
          ward_id: "W002",
          name: "Ward 2 - Camac Street",
          population: 18000,
          councillor: "Jane Smith",
          party: "Party B"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3650, 22.5750],
            [88.3750, 22.5750],
            [88.3750, 22.5850],
            [88.3650, 22.5850],
            [88.3650, 22.5750]
          ]]
        },
        properties: {
          ward_id: "W003",
          name: "Ward 3 - Middleton Street",
          population: 12000,
          councillor: "Bob Johnson",
          party: "Party C"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3750, 22.5750],
            [88.3850, 22.5750],
            [88.3850, 22.5850],
            [88.3750, 22.5850],
            [88.3750, 22.5750]
          ]]
        },
        properties: {
          ward_id: "W004",
          name: "Ward 4 - Ballygunge",
          population: 22000,
          councillor: "Mary Brown",
          party: "Party A"
        }
      }
    ]
  },

  // === SCENARIO 7: Mixed Geometry Types for Crosses Test ===
  pipelines: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3600, 22.5600],
            [88.3700, 22.5650],
            [88.3800, 22.5700],
            [88.3900, 22.5750]
          ]
        },
        properties: {
          pipeline_id: "PL001",
          name: "Main Gas Pipeline",
          diameter_inches: 24,
          pressure_psi: 1200,
          capacity_mcfd: 500
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [88.3550, 22.5750],
            [88.3650, 22.5780],
            [88.3750, 22.5810],
            [88.3850, 22.5840]
          ]
        },
        properties: {
          pipeline_id: "PL002",
          name: "Water Pipeline",
          diameter_inches: 36,
          pressure_psi: 80,
          capacity_mcfd: 2000
        }
      }
    ]
  },

  conservation_areas: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3650, 22.5620],
            [88.3750, 22.5620],
            [88.3750, 22.5720],
            [88.3650, 22.5720],
            [88.3650, 22.5620]
          ]]
        },
        properties: {
          area_id: "CA001",
          name: "Park Street Heritage Zone",
          type: "Heritage",
          protection_level: "High",
          established: 1990
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [88.3780, 22.5680],
            [88.3880, 22.5680],
            [88.3880, 22.5780],
            [88.3780, 22.5780],
            [88.3780, 22.5680]
          ]]
        },
        properties: {
          area_id: "CA002",
          name: "Ballygunge Green Zone",
          type: "Environmental",
          protection_level: "Medium",
          established: 2005
        }
      }
    ]
  }
};