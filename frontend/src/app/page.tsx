"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import IncidentFeed from '@/components/IncidentFeed';
import IncidentDetailModal from '@/components/IncidentDetailModal';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

// Proxy through Next.js API route (same origin) to avoid Chrome's
// ERR_CONNECTION_RESET on cross-origin MJPEG streams (port 3000 → 8080).
const STREAM_URL = '/api/stream';

export default function Home() {
  const [incidents, setIncidents]           = useState<any[]>([]);
  const [atms, setAtms]                     = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [socket, setSocket]                 = useState<Socket | null>(null);

  // Signal-lost overlay: only shown after confirmed repeated failures
  const [signalLost, setSignalLost]         = useState(false);
  // Key bump forces <img> to remount and reconnect the stream
  const [streamKey, setStreamKey]           = useState(0);
  const failTimer                           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successRef                          = useRef(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/v1/incidents')
      .then(r => r.json()).then(d => setIncidents(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch('http://localhost:5000/api/v1/atms')
      .then(r => r.json()).then(d => setAtms(Array.isArray(d) ? d : []))
      .catch(() => {});

    const s = io('http://localhost:5000');
    setSocket(s);

    s.on('new_incident',     (d: any) => setIncidents(p => [d, ...p]));
    s.on('incident_updated', (d: any) => {
      setIncidents(p => p.map(i => i.incident_id === d.incident_id ? d : i));
      setSelectedIncident((prev: any) =>
        prev?.incident_id === d.incident_id ? d : prev);
    });
    s.on('atm_status_update', (d: any) => setAtms(p => {
      const exists = p.find((a: any) => a.atm_id === d.atm_id);
      return exists ? p.map((a: any) => a.atm_id === d.atm_id ? d : a) : [...p, d];
    }));

    return () => { s.disconnect(); };
  }, []);

  // onLoad fires when the browser successfully starts reading the MJPEG stream.
  const handleLoad = () => {
    successRef.current = true;
    setSignalLost(false);
    if (failTimer.current) clearTimeout(failTimer.current);
  };

  // onError fires if the stream connection drops or edge is unreachable.
  // Wait 3 s then bump key to reconnect; show signal-lost after 2 failures.
  const handleError = () => {
    if (failTimer.current) clearTimeout(failTimer.current);
    failTimer.current = setTimeout(() => {
      setSignalLost(true);
      setStreamKey(k => k + 1);   // remount <img> → fresh GET request
    }, 3000);
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-300 overflow-hidden font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-20 border-r border-neutral-800 bg-neutral-900 flex flex-col items-center py-6 z-20">
        <div className="bg-red-900/40 p-3 flex justify-center items-center text-red-500 rounded-lg mb-8 outline outline-1 outline-red-900 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <ShieldAlert size={28} />
        </div>
        <nav className="flex flex-col gap-6 w-full">
          <button className="flex flex-col items-center gap-1 text-neutral-500 hover:text-white transition group relative w-full">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white transition" />
            <Activity size={24} className="text-white" />
            <span className="text-[10px] font-medium tracking-wider text-white">MAP</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-neutral-500 hover:text-white transition w-full">
            <Cpu size={24} />
            <span className="text-[10px] font-medium tracking-wider">SYSTEMS</span>
          </button>
        </nav>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden">

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 h-16 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur flex items-center justify-between px-6 z-10">
          <h1 className="text-xl font-bold tracking-widest text-white">
            SADRS <span className="opacity-50 text-sm font-normal">| OPs Center Console</span>
          </h1>
          <span className="text-xs font-mono px-3 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-900">
            SYSTEM ONLINE
          </span>
        </header>

        {/* ── MJPEG Feed ──────────────────────────────────────────── */}
        {/*
          The <img> is ALWAYS rendered and visible.
          We do NOT hide it with display:none — hiding prevents the browser
          from establishing the persistent HTTP connection for the MJPEG stream,
          meaning onLoad never fires and the feed never appears.

          Signal-lost text is shown as an absolute overlay on top.
        */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <img
            key={streamKey}
            src={`${STREAM_URL}?k=${streamKey}`}
            alt="Live CCTV"
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.92,
            }}
          />

          {/* Signal-lost overlay — rendered OVER the img, not instead of it */}
          {signalLost && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3"
              style={{ pointerEvents: 'none' }}
            >
              <span className="text-red-500 font-mono text-lg tracking-widest animate-pulse">
                WEBCAM SIGNAL LOST
              </span>
              <span className="text-neutral-600 font-mono text-xs tracking-wider">
                Reconnecting to edge stream server…
              </span>
            </div>
          )}

          {/* Vignette */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(10,10,10,0.8)]" />
        </div>

        {/* ── Map PIP ─────────────────────────────────────────────── */}
        <div className="absolute bottom-6 left-6 w-96 h-64 rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur overflow-hidden shadow-2xl z-10 flex flex-col">
          <div className="flex justify-between items-center px-3 py-2 border-b border-neutral-800 bg-black/50">
            <span className="text-[10px] font-mono text-neutral-400 tracking-wider">ATM GEOLOCATIONS</span>
          </div>
          <div className="flex-1 relative">
            <MapComponent atms={atms} />
          </div>
        </div>

      </main>

      {/* ── Incident Feed ───────────────────────────────────────────── */}
      <IncidentFeed incidents={incidents} onSelectIncident={setSelectedIncident} />

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          socket={socket}
        />
      )}
    </div>
  );
}
