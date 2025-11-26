import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const PrintBrowserControl = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Load plugin script dynamically from CDN if not already loaded
    if (!L.control.browserPrint) {
      const script = document.createElement("script");
      script.src =
        "https://unpkg.com/leaflet.browser.print@2.0.2/dist/leaflet.browser.print.min.js";
      script.async = true;
      script.onload = () => {
        initPrintControl();
      };
      script.onerror = () => {
        console.error("Failed to load leaflet.browser.print plugin");
      };
      document.head.appendChild(script);
    } else {
      initPrintControl();
    }

    const initPrintControl = () => {
      const options = {
        position: "topleft",
        closePopupsOnPrint: true,
        printModes: ["Portrait", "Landscape"],
        printLayerOptions: {
          showTitle: true,
        },
      };

      const control = L.control.browserPrint(options);
      if (control) control.addTo(map);
    };

    return () => {
      try {
        map.removeControl(map._printControl);
      } catch (e) {
        // safe cleanup
      }
    };
  }, [map]);

  return null;
};

export default PrintBrowserControl;
