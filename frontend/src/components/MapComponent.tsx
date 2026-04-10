"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix leaflet icon paths
const customRedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const customGreenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

/** Sub-component: re-centers the map whenever the center coords change */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
}

export default function MapComponent({ atms }: { atms: any[] }) {
    // India geographic center as neutral fallback while geolocation loads
    const indiaCenter: [number, number] = [22.5937, 78.9629];

    // Center map on the DASHBOARD user's real browser location
    const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
    const [geoError, setGeoError] = useState(false);

    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError(true);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserCenter([pos.coords.latitude, pos.coords.longitude]);
            },
            () => {
                setGeoError(true);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }, []);

    const center: [number, number] = userCenter ?? indiaCenter;
    const zoom = userCenter ? 13 : 5;

    // Only render ATMs that have real coordinates — no random jitter
    const mappableAtms = atms.filter(a => a.latitude && a.longitude);

    return (
        <div className="w-full h-full">
            {!userCenter && !geoError && (
                <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
                    <span className="text-neutral-400 font-mono text-xs bg-black/70 px-3 py-1 rounded animate-pulse">
                        📡 Acquiring location...
                    </span>
                </div>
            )}
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', backgroundColor: '#0f0f11' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
                />

                {/* Auto-recenter map when GPS data arrives from edge */}
                <RecenterMap lat={center[0]} lng={center[1]} />

                {mappableAtms.map((atm) => {
                    const isCritical = atm.status === 'incident';

                    return (
                        <Marker
                            key={atm.atm_id}
                            position={[atm.latitude, atm.longitude]}
                            icon={isCritical ? customRedIcon : customGreenIcon}
                        >
                            <Popup className="bg-neutral-900 text-white rounded-lg border border-neutral-800">
                                <div className="p-2">
                                    <h3 className="font-bold text-lg mb-1">{atm.atm_id}</h3>
                                    <p className="text-xs text-neutral-400 mb-1">📍 {atm.location_name || 'Unknown Location'}</p>
                                    <p className="text-xs text-neutral-500 mb-2 font-mono">{atm.latitude?.toFixed(4)}, {atm.longitude?.toFixed(4)}</p>
                                    <span className={`px-2 py-1 text-xs rounded uppercase tracking-wider font-bold ${isCritical ? 'bg-red-900/40 text-red-500 border border-red-900' : 'bg-green-900/30 text-green-400 border border-green-900'}`}>
                                        {atm.status}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Empty state overlay */}
                {mappableAtms.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
                        <span className="text-neutral-500 font-mono text-xs bg-black/60 px-3 py-1 rounded">Waiting for ATM registration...</span>
                    </div>
                )}
            </MapContainer>
        </div>
    );
}
