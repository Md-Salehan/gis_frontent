# Technical Documentation

## 1. Project Information

- Project Name: GIS Frontend
- Type: Web GIS application
- Framework: React + Vite
- Mapping Library: Leaflet + React Leaflet
- UI Library: Ant Design
- State Management: Redux Toolkit + Redux Persist
- API Layer: RTK Query + Axios
- Spatial Analysis: Turf.js, proj4, WKT, GeoJSON utilities
- Target Use Case: Portal-based geographic information system with map visualization, layer management, measurement, analysis, and printing

## 2. Document Control

- Document Version: 1.0
- Prepared For: Project review, onboarding, and future maintenance
- Primary Source Files:
  - [src/App.jsx](src/App.jsx)
  - [src/main.jsx](src/main.jsx)
  - [src/Layout/Main.jsx](src/Layout/Main.jsx)
  - [src/pages/auth/Auth.jsx](src/pages/auth/Auth.jsx)
  - [src/pages/GisPortal/GisPortal.jsx](src/pages/GisPortal/GisPortal.jsx)
  - [src/pages/GisDashboard/GisDashboard.jsx](src/pages/GisDashboard/GisDashboard.jsx)
  - [src/store/index.js](src/store/index.js)
  - [src/store/api/baseApi.js](src/store/api/baseApi.js)
  - [package.json](package.json)
  - [vite.config.js](vite.config.js)

## 3. Executive Summary

This project is a GIS web application that allows users to authenticate, select a portal, and interact with geospatial layers on a map dashboard. The application is designed as a modular React frontend that uses Leaflet for map rendering and Redux Toolkit for state management.

The solution includes:

- portal listing and portal search
- authentication landing page
- GIS dashboard with side navigation
- map rendering with base layers and overlays
- identify, measurement, and legend tools
- buffer analysis and spatial analytics
- print/export functionality
- attribute table integration
- data-driven portal loading from backend services

## 4. Objectives and Scope

### 4.1 Objectives

- provide a portal-based GIS interface
- load geospatial data dynamically for selected portals
- support common GIS operations in a browser
- maintain modular front-end architecture for future extension
- keep state persisted during user session

### 4.2 Scope

The project currently covers:

- user authentication start page
- portal navigation and catalog listing
- map-based dashboard workflow
- base map and overlay controls
- layer visibility management
- measurement and inspection tools
- spatial analysis modules
- print and export options

## 5. System Architecture

### 5.1 High-Level Architecture

The application follows a client-side architecture where React components render the UI, Redux manages the application state, and RTK Query handles API communication with the backend. Leaflet is used as the map rendering engine and is integrated with React components.

```text
Browser
  │
  ├── React UI Components
  │     ├── Auth Page
  │     ├── Portal Page
  │     └── GIS Dashboard
  │
  ├── Redux Store
  │     ├── auth
  │     ├── portal
  │     ├── map
  │     └── ui
  │
  ├── RTK Query API Layer
  │     └── backend endpoints
  │
  └── Leaflet Map Engine
        ├── base layers
        ├── GeoJSON overlays
        ├── measure tools
        └── spatial analysis tools
```

### 5.2 Frontend Stack

| Layer | Technology | Purpose |
|---|---|---|
| Presentation | React 19 | UI rendering and component-based architecture |
| Build Tool | Vite | module bundling and dev environment |
| Routing | React Router | navigation across auth, portal, dashboard |
| Mapping | Leaflet + React Leaflet | map rendering and geospatial interaction |
| State | Redux Toolkit | central app state management |
| Persistence | Redux Persist | session persistence |
| API | RTK Query + fetchBaseQuery | backend integration |
| Styling | Ant Design + CSS | layout and UI styling |
| Spatial Processing | Turf.js, proj4, WKT | geospatial operations and coordinate handling |

## 6. Project Structure

### 6.1 Root Structure

- [src/App.jsx](src/App.jsx)
- [src/main.jsx](src/main.jsx)
- [src/index.css](src/index.css)
- [src/Layout/Main.jsx](src/Layout/Main.jsx)
- [src/pages](src/pages)
- [src/components](src/components)
- [src/store](src/store)
- [src/utils](src/utils)
- [src/constants](src/constants)
- [src/hooks](src/hooks)
- [src/context](src/context)

### 6.2 Functional Organization

| Directory | Role |
|---|---|
| src/pages | actual application pages and modules |
| src/components | reusable UI and map feature components |
| src/store | Redux slices and API configuration |
| src/utils | geospatial and helper utilities |
| src/constants | configuration and static values |
| src/context | context providers for messages and notifications |
| src/hooks | custom hooks for interaction logic |

## 7. Application Flow

### 7.1 Route Flow

The application uses React Router and defines three major routes in [src/App.jsx](src/App.jsx):

| Route | Component | Purpose |
|---|---|---|
| / | Auth page | login or access landing page |
| /portal | Portal listing | select a portal |
| /gis-dashboard/:portal_url | GIS dashboard | render selected portal dashboard |

### 7.2 Navigation Logic

- a user starts at the authentication page
- the next step is portal selection in the portal list
- upon portal selection, the system routes to the GIS dashboard using the portal URL
- the dashboard identifies the active portal and loads its relevant map state and data

## 8. Page-by-Page Technical Documentation

### 8.1 Authentication Page

Primary file: [src/pages/auth/Auth.jsx](src/pages/auth/Auth.jsx)

Purpose:
- load the application entry screen
- provide login or access gateway experience
- display branding and access controls

Key design elements:
- uses a split-screen layout with left and right sections
- styled by [src/pages/auth/Auth.css](src/pages/auth/Auth.css)
- contains reusable components such as Google authentication action and authentication UI blocks

### 8.2 Portal Page

Primary file: [src/pages/GisPortal/GisPortal.jsx](src/pages/GisPortal/GisPortal.jsx)

Purpose:
- fetch available portals from backend
- allow search and filter by portal name or description
- present the list of available portals in a searchable card/grid interface

Key features:
- uses RTK Query hook `useGetPortalsQuery`
- stores portal list in Redux via `setPortalList`
- supports AutoComplete search box with live filtering
- sets filtered portal list based on search input
- updates selected portal on click/select event

Important related files:
- [src/store/api/portalApi.js](src/store/api/portalApi.js)
- [src/store/slices/portalSlice.js](src/store/slices/portalSlice.js)
- [src/pages/GisPortal/GisPortal.css](src/pages/GisPortal/GisPortal.css)

### 8.3 GIS Dashboard

Primary file: [src/pages/GisDashboard/GisDashboard.jsx](src/pages/GisDashboard/GisDashboard.jsx)

Purpose:
- render the active GIS workspace
- show a map and side controls for geospatial actions
- connect UI actions to map operations

Key features:
- loads the active portal using `portal_url` from URL params
- initializes Geoman drawing tools on mount
- manages sidebar collapse and map state
- provides map toolbar actions for measurement, legend, print, buffer, and identify
- supports spatial analysis submenu including centroid, count points, and distance matrix

Dashboard layout includes:
- sidebar navigation
- header toolbar
- map panel
- footer bar
- utility drawers and modals

## 9. Component Documentation

### 9.1 Shared Layout Components

| Component | File | Purpose |
|---|---|---|
| Main wrapper | [src/Layout/Main.jsx](src/Layout/Main.jsx) | wraps app in context provider |
| Auth page | [src/pages/auth/Auth.jsx](src/pages/auth/Auth.jsx) | login/entry interface |
| Portal page | [src/pages/GisPortal/GisPortal.jsx](src/pages/GisPortal/GisPortal.jsx) | portal catalog and search |
| Dashboard | [src/pages/GisDashboard/GisDashboard.jsx](src/pages/GisDashboard/GisDashboard.jsx) | map workspace |

### 9.2 Map and GIS Components

Major map-related files are under [src/components/map](src/components/map) and [src/components/common](src/components/common):

| Component | File | Description |
|---|---|---|
| Base map switcher | [src/components/common/BaseMapSwitcher.jsx](src/components/common/BaseMapSwitcher.jsx) | switch basemap |
| GeoJSON wrapper | [src/components/common/GeoJsonLayerWrapper.jsx](src/components/common/GeoJsonLayerWrapper.jsx) | render GeoJSON layers |
| Legend | [src/components/common/Legend.jsx](src/components/common/Legend.jsx) | display layer legend |
| Measure control | [src/components/common/MeasureControl.jsx](src/components/common/MeasureControl.jsx) | measure distances/areas |
| Buffer tool | [src/components/map/BufferTool.jsx](src/components/map/BufferTool.jsx) | buffer analysis feature |
| Attribute table | [src/components/map/AttributeTable.jsx](src/components/map/AttributeTable.jsx) | feature table display |
| Printable map | [src/components/map/PrintControl.jsx](src/components/map/PrintControl.jsx) | map export UI |
| Mini map | [src/components/common/MiniMapControl.jsx](src/components/common/MiniMapControl.jsx) | overview map |
| Geoman edit tool | [src/components/common/GeomanControl.jsx](src/components/common/GeomanControl.jsx) | editing/drawing tools |

## 10. State Management Design

### 10.1 Redux Store Structure

The store is configured in [src/store/index.js](src/store/index.js). It combines the reducers for:

- auth
- portal
- map
- ui
- RTK API reducer

### 10.2 Slice Responsibilities

| Slice | File | Responsibility |
|---|---|---|
| authSlice | [src/store/slices/authSlice.js](src/store/slices/authSlice.js) | authentication state and token |
| portalSlice | [src/store/slices/portalSlice.js](src/store/slices/portalSlice.js) | portal listing and active portal selection |
| mapSlice | [src/store/slices/mapSlice.js](src/store/slices/mapSlice.js) | map state, layers, viewport, buffer, measurements |
| uiSlice | [src/store/slices/uiSlice.js](src/store/slices/uiSlice.js) | panel visibility, modal state, minimization |

### 10.3 Persistence Model

The application persists selected state values using redux-persist with session storage:

- auth
- ui
- portal

This allows session continuity while avoiding unnecessary persistence of map-heavy runtime data.

## 11. API and Data Layer

### 11.1 Base API Configuration

Primary file: [src/store/api/baseApi.js](src/store/api/baseApi.js)

The application uses a shared base query connected to the endpoint configured in the environment file:

- [ .env ](.env)

The base URL comes from `VITE_API_URL` and adds a bearer token when a token exists in session storage, excluding auth endpoints.

### 11.2 Portal API

Primary file: [src/store/api/portalApi.js](src/store/api/portalApi.js)

Current endpoints:

- `portal/list/`
- `portal/${id}/`

These are used to load available portals and portal metadata.

### 11.3 API Flow

1. App loads the portal page.
2. RTK Query fetches portal list from backend.
3. Portal list is stored in Redux.
4. User selects a portal.
5. Dashboard resolves portal by URL and updates state.
6. Map layer and feature data are loaded as needed by the GIS modules.

## 12. GIS Functional Modules

### 12.1 Base Map and Layer Management

The app supports:

- multiple base map options
- GeoJSON layer overlays
- toggleable dataset visibility
- order management for layers
- features selected from active map layers

This is driven primarily by map slice state and common map wrapper components.

### 12.2 Measure Tool

The dashboard includes a measure tool for area and distance calculations. The relevant logic lives in:

- [src/hooks/useAreaMeasurement.js](src/hooks/useAreaMeasurement.js)
- [src/hooks/useLineMeasurement.js](src/hooks/useLineMeasurement.js)
- [src/components/common/MeasureControl.jsx](src/components/common/MeasureControl.jsx)

This supports geospatial measurement and unit selection.

### 12.3 Buffer Analysis

The buffer workflow is available through the dashboard UI and is associated with map buffer layers. Related files include:

- [src/components/map/BufferTool.jsx](src/components/map/BufferTool.jsx)
- [src/components/map/BufferAnalysisResults.jsx](src/components/map/BufferAnalysisResults.jsx)
- [src/components/common/BufferGeoJsonLayer.jsx](src/components/common/BufferGeoJsonLayer.jsx)

The buffer layer logic is also tracked in the map slice under `bufferLayers` and `bufferOrder`.

### 12.4 Attribute Table

The attribute table shows feature metadata and supports feature selection. Relevant files:

- [src/components/map/AttributeTable.jsx](src/components/map/AttributeTable.jsx)
- [src/components/map/AttributeTableDrawer.jsx](src/components/map/AttributeTableDrawer.jsx)

### 12.5 Spatial Analysis

The GIS dashboard includes a spatial analysis menu with the following analysis types:

- Centroid
- Count Points in Polygon
- Distance Matrix

Related files:

- [src/components/spatialAnalysis](src/components/spatialAnalysis)
- [src/components/spatialAnalysis/index.jsx](src/components/spatialAnalysis/index.jsx)
- [src/components/spatialAnalysis/Centroid.jsx](src/components/spatialAnalysis/Centroid.jsx)
- [src/components/spatialAnalysis/CountPointsInPolygon.jsx](src/components/spatialAnalysis/CountPointsInPolygon.jsx)
- [src/components/spatialAnalysis/DistanceMatrix.jsx](src/components/spatialAnalysis/DistanceMatrix.jsx)

### 12.6 Print / Export

The dashboard includes print support and export-like functionality through map print components.

Relevant files:

- [src/components/map/PrintControl.jsx](src/components/map/PrintControl.jsx)
- [src/components/map/PrintPreviewMap.jsx](src/components/map/PrintPreviewMap.jsx)

## 13. Utility Layer

The utilities directory contains many reusable geospatial helpers that manage geometry, styling, transforms, and layer generation.

| Utility | Purpose |
|---|---|
| [src/utils/styleUtils.js](src/utils/styleUtils.js) | style rules for map features |
| [src/utils/helper.js](src/utils/helper.js) | generic helper methods |
| [src/utils/transformProperties.js](src/utils/transformProperties.js) | property transformation and conversion |
| [src/utils/queryBuilder.util.js](src/utils/queryBuilder.util.js) | query builder logic |
| [src/utils/getGeomFullForm.js](src/utils/getGeomFullForm.js) | geometry formatting and full geometry extraction |
| [src/utils/tooltipUtils.js](src/utils/tooltipUtils.js) | tooltip generation |
| [src/utils/labelUtils.js](src/utils/labelUtils.js) | mapping labels |
| [src/utils/mapScaleCalculations.js](src/utils/mapScaleCalculations.js) | scale calculations |

## 14. Environment and Deployment Configuration

### 14.1 Environment Variables

The project uses a root environment file: [.env](.env)

Current variables include:

- `VITE_JAVA_SERVER_PREFIX`
- `VITE_API_URL`

These values are used to connect the frontend to GIS backend services and Java server-hosted resources.

### 14.2 Build Configuration

The build configuration is defined in [vite.config.js](vite.config.js).

Key settings:

- base path is set as `/gis`
- output directory is `build`
- asset naming patterns are customized
- host is enabled for outside-local network access
- strict port is enforced on port 5173

### 14.3 Package Configuration

Dependencies and scripts are listed in [package.json](package.json).

Main scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## 15. Security and Authentication Notes

The system uses a bearer token strategy in the API layer. From [src/store/api/baseApi.js](src/store/api/baseApi.js):

- `sessionStorage` is checked for a token
- token is sent in Authorization header for non-auth requests
- auth endpoints are excluded from bearer token injection

The authentication state is persisted in Redux, but token storage is still handled via session storage to support API calls.

## 16. Risks and Limitations

- large GIS datasets may affect map performance if rendered directly in browser
- layered geospatial logic can become complex as the number of maps grows
- map rendering can be sensitive to browser memory and CPU load
- backend API availability is a critical runtime dependency
- some map interactions are tightly coupled to project-specific business logic

## 17. Future Enhancements

Possible improvements include:

- role-based access control
- real-time data refresh and live map updates
- advanced custom layer management
- multi-portal configuration dashboard
- export to PDF, CSV, or shapefile workflows
- stronger map optimization with clustering, tiles, and simplification
- better error-handling and loading skeletons

## 18. Portal, Page, Section, and Feature Matrix

| No. | Portal / Page | Section | Feature / Function | Source |
|---|---|---|---|---|
| 1 | Global App | Routing | App route mapping for auth, portal, and GIS dashboard | [src/App.jsx](src/App.jsx) |
| 2 | Auth Page | Entry Screen | login/access landing page | [src/pages/auth/Auth.jsx](src/pages/auth/Auth.jsx) |
| 3 | Auth Page | Layout | left and right panel split layout | [src/pages/auth/Auth.css](src/pages/auth/Auth.css) |
| 4 | Portal Page | Search | portal search by name and description | [src/pages/GisPortal/GisPortal.jsx](src/pages/GisPortal/GisPortal.jsx) |
| 5 | Portal Page | Listing | list all available portals | [src/pages/GisPortal/GisPortal.jsx](src/pages/GisPortal/GisPortal.jsx) |
| 6 | Portal Page | State | portal state storage and selection | [src/store/slices/portalSlice.js](src/store/slices/portalSlice.js) |
| 7 | GIS Dashboard | Header | top toolbar with actions and controls | [src/pages/GisDashboard/GisDashboard.jsx](src/pages/GisDashboard/GisDashboard.jsx) |
| 8 | GIS Dashboard | Sidebar | map tools and navigation panel | [src/pages/GisDashboard/GisDashboard.jsx](src/pages/GisDashboard/GisDashboard.jsx) |
| 9 | GIS Dashboard | Map Panel | center map workspace | [src/pages/GisDashboard/GisDashboard.jsx](src/pages/GisDashboard/GisDashboard.jsx) |
| 10 | GIS Dashboard | Basemap | switch map base layers | [src/components/common/BaseMapSwitcher.jsx](src/components/common/BaseMapSwitcher.jsx) |
| 11 | GIS Dashboard | Layers | manage GeoJSON overlay visibility | [src/components/common/GeoJsonLayerWrapper.jsx](src/components/common/GeoJsonLayerWrapper.jsx) |
| 12 | GIS Dashboard | Identify | inspect features on map | [src/store/slices/uiSlice.js](src/store/slices/uiSlice.js) |
| 13 | GIS Dashboard | Measure | distance and area measurement | [src/hooks/useLineMeasurement.js](src/hooks/useLineMeasurement.js) and [src/hooks/useAreaMeasurement.js](src/hooks/useAreaMeasurement.js) |
| 14 | GIS Dashboard | Legend | toggle legend visibility | [src/components/common/Legend.jsx](src/components/common/Legend.jsx) |
| 15 | GIS Dashboard | Print | export/print map | [src/components/map/PrintControl.jsx](src/components/map/PrintControl.jsx) |
| 16 | GIS Dashboard | Buffer | create buffer around selected geometry | [src/components/map/BufferTool.jsx](src/components/map/BufferTool.jsx) |
| 17 | GIS Dashboard | Attributes | feature attribute table | [src/components/map/AttributeTable.jsx](src/components/map/AttributeTable.jsx) |
| 18 | GIS Dashboard | Spatial Analysis | centroid, count points, distance matrix | [src/components/spatialAnalysis/index.jsx](src/components/spatialAnalysis/index.jsx) |
| 19 | Shared Components | Map UI | minimap, label layer, movable panels | [src/components/common](src/components/common) |
| 20 | Data Layer | Portal API | fetch portal metadata from service | [src/store/api/portalApi.js](src/store/api/portalApi.js) |
| 21 | Data Layer | Map State | manage viewport, selected features, layers | [src/store/slices/mapSlice.js](src/store/slices/mapSlice.js) |
| 22 | State Layer | UI state | toggle open/close drawer and modal states | [src/store/slices/uiSlice.js](src/store/slices/uiSlice.js) |
| 23 | Utilities | Geometry | geometry transformation and data helpers | [src/utils](src/utils) |
| 24 | Config | Environment | backend connection and app configuration | [.env](.env) |
| 25 | Build | Application packaging | production bundle config | [vite.config.js](vite.config.js) |

## 19. Table of Contents Summary

1. Project Information
2. Document Control
3. Executive Summary
4. Objectives and Scope
5. System Architecture
6. Project Structure
7. Application Flow
8. Page-by-Page Technical Documentation
9. Component Documentation
10. State Management Design
11. API and Data Layer
12. GIS Functional Modules
13. Utility Layer
14. Environment and Deployment Configuration
15. Security and Authentication Notes
16. Risks and Limitations
17. Future Enhancements
18. Portal, Page, Section, and Feature Matrix
19. Conclusion

## 20. Conclusion

This GIS frontend project is a modern, portal-driven spatial web app built on React and Leaflet. It provides a flexible base for map-based analysis, portal-based access control, and GIS workspace interaction. The architecture is modular and maintainable, and it is well suited for future expansion into larger geospatial workflows, more layers, and richer analysis features.

The codebase is organized around clear responsibilities:

- pages for user experience
- components for GIS functionality
- store for application state
- API layer for backend integration
- utilities for geospatial logic and transformation

This makes the project a suitable foundation for a scalable GIS platform.
