import { useEffect, useRef, useState } from "react";
import L from "leaflet";

function popupContent(restaurant) {
  const container = document.createElement("div");
  container.className = "map-popup";
  const name = document.createElement("strong");
  name.textContent = restaurant.name;
  const details = document.createElement("span");
  details.textContent = `${restaurant.cuisine} · ${restaurant.score.toFixed(1)} (${restaurant.ratingCount.toLocaleString()})`;
  const link = document.createElement("a");
  link.href = `/restaurant/${restaurant.id}`;
  link.textContent = "See the menu";
  container.append(name, details, link);
  return container;
}

export default function MapPanel({ restaurants }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open || !containerRef.current || !restaurants.length) return undefined;

    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([51.7528, -1.2528], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const icon = L.divIcon({ className: "plate-map-marker", html: "<span></span>", iconSize: [28, 36], iconAnchor: [14, 34], popupAnchor: [0, -32] });
    const bounds = [];
    restaurants.forEach((restaurant) => {
      const position = [restaurant.latitude, restaurant.longitude];
      bounds.push(position);
      L.marker(position, { icon, title: restaurant.name })
        .addTo(map)
        .bindPopup(popupContent(restaurant));
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => map.remove();
  }, [open, restaurants]);

  return (
    <section className="map-section">
      <button className={`map-toggle ${open ? "map-toggle-open" : ""}`} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span><strong>Explore the map</strong><small>{restaurants.length} matching Oxford {restaurants.length === 1 ? "restaurant" : "restaurants"}</small></span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (restaurants.length > 0 ? (
        <div ref={containerRef} className="map" aria-label="Map of matching Plate restaurants in Oxford" />
      ) : (
        <div className="map map-empty" role="status">No matching restaurants to show on the map.</div>
      ))}
    </section>
  );
}
