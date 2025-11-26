import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useSelector } from "react-redux";
import L from "leaflet";

const PrintBrowserControl = () => {
  const map = useMap();
  const printSettings = useSelector((state) => state.print);

  useEffect(() => {
    if (!map) return;

    // Load plugin script dynamically from CDN if not already loaded
    if (!window.L?.control?.browserPrint) {
      const script = document.createElement("script");
      script.src =
        "https://unpkg.com/leaflet.browser.print@2.0.2/dist/leaflet.browser.print.min.js";
      script.async = true;
      script.onload = () => {
        window.L = L;
      };
      script.onerror = () => {
        console.error("Failed to load leaflet.browser.print plugin");
      };
      document.head.appendChild(script);
    }
  }, [map]);

  // Expose print function to window for external trigger
  useEffect(() => {
    window.triggerMapPrint = (title, footer) => {
      if (!map || !window.L?.control?.browserPrint) {
        console.error("Map or plugin not ready");
        return;
      }

      const options = {
        position: "topleft",
        closePopupsOnPrint: true,
        printModes: ["Portrait", "Landscape"],
        printLayerOptions: {
          showTitle: !!title,
          title: title || "",
        },
        documentTitle: title || "Map Print",
        footer: footer || "",
      };

      // Create and add control to map
      const control = window.L.control.browserPrint(options);
      control.addTo(map);

      // Plugin automatically opens print dialog when control is added
    };

    return () => {
      delete window.triggerMapPrint;
    };
  }, [map, printSettings]);

  return null;
};

export default PrintBrowserControl;
