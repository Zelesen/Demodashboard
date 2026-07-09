import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const practices = [
  { name: "Kettering", coords: [52.3963, -0.7263], revenue: "£20.2k", score: "111.2%", status: "good" },
  { name: "Derby", coords: [52.9225, -1.4746], revenue: "£9.8k", score: "107.8%", status: "good" },
  { name: "Peterborough", coords: [52.5695, -0.2405], revenue: "£14.6k", score: "105.2%", status: "good" },
  { name: "Loughborough", coords: [52.7721, -1.2065], revenue: "£21.2k", score: "99.7%", status: "warn" },
  { name: "Northampton", coords: [52.2405, -0.9027], revenue: "£11.2k", score: "91.2%", status: "bad" },
  { name: "Rugby", coords: [52.3709, -1.2597], revenue: "£22.1k", score: "78.4%", status: "bad" },
  { name: "Lincoln", coords: [53.2349, -0.5378], revenue: "£13.4k", score: "78.5%", status: "bad" },
  { name: "Nottingham", coords: [52.9548, -1.1581], revenue: "£22.8k", score: "80.4%", status: "bad" },
  { name: "Leicester", coords: [52.6369, -1.1398], revenue: "£20.1k", score: "85.4%", status: "bad" },
  { name: "Corby", coords: [52.4926, -0.6851], revenue: "£16.3k", score: "88.2%", status: "warn" },
];

const statusColors = {
  good: "#15a34a",
  warn: "#ea8c2e",
  bad: "#dc3545",
};

function createCustomIcon(status) {
  const color = statusColors[status];
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 20px; 
        height: 20px; 
        background: ${color};
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4), 0 0 0 2px ${color}40;
        transition: transform 0.2s ease;
      " class="marker-pulse"></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

export default function PracticeMap() {
  return (
    <div className="h-[100%] rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
      {/* Map container with custom styling */}
      <MapContainer
        center={[52.6, -0.9]}
        zoom={9}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={true}
        className="h-full w-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        {practices.map((p) => (
          <Marker
            key={p.name}
            position={p.coords}
            icon={createCustomIcon(p.status)}
          >
            <Popup>
              <div className="font-sans min-w-[160px] p-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    p.status === 'good' ? 'bg-emerald-500' : 
                    p.status === 'warn' ? 'bg-orange-400' : 
                    'bg-rose-500'
                  }`}></div>
                  <p className="font-bold text-sm text-slate-800">{p.name}</p>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5 ml-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revenue:</span>
                    <span className="font-bold text-slate-700">{p.revenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">vs target:</span>
                    <span className={`font-bold ${
                      p.status === 'good' ? 'text-emerald-600' : 
                      p.status === 'warn' ? 'text-orange-600' : 
                      'text-rose-600'
                    }`}>{p.score}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay gradient for better integration */}
      <div className="absolute inset-0 pointer-events-none rounded-xl border border-slate-300/50 z-20"></div>
    </div>
  );
}
