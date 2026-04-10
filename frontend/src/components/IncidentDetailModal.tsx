"use client";

import { X, CheckCircle, ShieldAlert } from 'lucide-react';

export default function IncidentDetailModal({ incident, onClose, socket }: { incident: any, onClose: () => void, socket: any }) {

    const handleAction = (action: string) => {
        fetch(`http://localhost:5000/api/v1/incidents/${incident.incident_id}/action`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operator_action: action })
        })
            .catch(console.error);
    };

    const snapshot = incident.sensor_snapshot || {};
    const isPanic = incident.trigger_type === 'panic_pin';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-center ${isPanic ? 'border-red-900 bg-red-950/20' : 'border-neutral-800'}`}>
                    <div>
                        <div className="flex items-center gap-3">
                            <ShieldAlert className={isPanic ? 'text-red-500' : 'text-amber-500'} size={28} />
                            <h1 className="text-2xl font-bold uppercase tracking-widest text-white">INCIDENT REPORT</h1>
                        </div>
                        <p className="text-sm font-mono mt-2 text-neutral-400">ID: {incident.incident_id} | ATM: {incident.atm_id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition text-neutral-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-2 gap-6 bg-gradient-to-b from-transparent to-neutral-950/50">

                    {/* Left Column - Details & Sensors */}
                    <div className="space-y-6">
                        <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800">
                            <h3 className="text-sm font-bold tracking-widest text-neutral-500 mb-3 border-b border-neutral-800 pb-2">AI INCIDENT SUMMARY (CLAUDE SONNET 4.6)</h3>
                            <p className="text-neutral-300 leading-relaxed font-light text-sm italic border-l-2 border-indigo-500 pl-4">{incident.claude_summary || "Generating summary..."}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                <span className="text-xs font-mono text-neutral-500 block mb-1">VIBRATION</span>
                                <span className={`text-2xl font-bold ${snapshot.vibration_g > 1.5 ? 'text-red-500' : 'text-neutral-300'}`}>
                                    {snapshot.vibration_g?.toFixed(2) || '0.00'} g
                                </span>
                            </div>
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                <span className="text-xs font-mono text-neutral-500 block mb-1">TILT (X,Y)</span>
                                <span className={`text-2xl font-bold ${Math.abs(snapshot.tilt_x) > 10 ? 'text-red-500' : 'text-neutral-300'}`}>
                                    {snapshot.tilt_x?.toFixed(1) || '0.0'}°
                                </span>
                            </div>
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                <span className="text-xs font-mono text-neutral-500 block mb-1">PIR MOTION</span>
                                <span className={`text-xl font-bold ${snapshot.pir_triggered ? 'text-amber-500' : 'text-neutral-300'}`}>
                                    {snapshot.pir_triggered ? 'DETECTED' : 'CLEAR'}
                                </span>
                            </div>
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                                <span className="text-xs font-mono text-neutral-500 block mb-1">CONFIDENCE</span>
                                <span className="text-2xl font-bold text-neutral-300">
                                    {incident.confidence_score ? (incident.confidence_score * 100).toFixed(1) : '--'}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Evidence & Action */}
                    <div className="space-y-6 flex flex-col">
                        <div className="bg-black border border-neutral-800 rounded-xl overflow-hidden relative flex-1 min-h-[250px] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                            <div className="absolute top-4 left-4 flex gap-2 z-10">
                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">REC</span>
                                <span className="bg-neutral-900/80 text-neutral-300 text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur">CAM-01</span>
                            </div>

                            {incident.clip_filename ? (
                                <video
                                    src={`http://localhost:5000/api/v1/evidence/${incident.clip_filename}`}
                                    title="Evidence Clip"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    autoPlay
                                    controls
                                    muted
                                />
                            ) : (
                                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center text-neutral-500 font-mono text-sm">
                                    [NO EVIDENCE CLIP AVAILABLE]
                                </div>
                            )}

                            {/* Crosshair Overlay */}
                            {incident.threat_class && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-32 h-32 border-2 border-red-500/50 block">
                                        <span className="bg-red-500 text-white text-xs px-1 absolute -top-5 -left-0.5">{incident.threat_class}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex gap-3">
                            {incident.operator_action ? (
                                <div className="w-full flex justify-center items-center py-3 border border-neutral-800 rounded-lg bg-neutral-900/50">
                                    <span className="font-bold flex items-center gap-2 text-neutral-400">
                                        <CheckCircle size={18} /> ACTION TAKEN: <span className="text-white uppercase">{incident.operator_action}</span>
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleAction('confirmed')}
                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition"
                                    >
                                        CONFIRM THREAT
                                    </button>
                                    <button
                                        onClick={() => handleAction('dismissed')}
                                        className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-lg transition border border-neutral-700 hover:border-neutral-500"
                                    >
                                        DISMISS (FALSE ALARM)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
