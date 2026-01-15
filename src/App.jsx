import { lazy, Suspense, useState } from "react";
import { Routes, Route } from "react-router-dom";

const Auth = lazy(() => import("./pages/auth/Auth"));
const GisPortal = lazy(() => import("./pages/GisPortal/GisPortal"));
// const GisDashboard = lazy(() => import("./pages/GisDashboard_/GisDashboard"));
const GisDashboard = lazy(() => import("./pages/GisDashboard/GisDashboard"));


function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/portal" element={<GisPortal />} />
        <Route path="/gis-dashboard/:portal_url" element={<GisDashboard />} />
        {/* Add more routes as needed */}
      </Routes>
    </Suspense>
  );
}

export default App;
