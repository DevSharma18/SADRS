"use client";

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Clock, Target, CheckCircle, XCircle } from 'lucide-react';

export default function IncidentFeed({ incidents, onSelectIncident }: { incidents: any[], onSelectIncident: (incident: any) => void }) {

    const getSeverityColors = (triggerType: string, action: string) => {
        if (action === "dismissed") return "border-neutral-800 bg-neutral-900/50 text-neutral-500 opacity-60";
        if (action === "confirmed") return "border-neutral-700 bg-neutral-800 text-neutral-300";
        if (triggerType === 'panic_pin') return "border-red-900 bg-red-950/20 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.1)]";
        if (triggerType === 'tamper') return "border-orange-900 bg-orange-950/20 text-orange-100";
        return "border-amber-900 bg-amber-950/20 text-amber-100";
    };

    const getStatusIcon = (action: string) => {
        if (action === "confirmed") return <CheckCircle size={16} className="text-green-500" />;
        if (action === "dismissed") return <XCircle size={16} className="text-neutral-500" />;
        return <AlertTriangle size={16} className="text-red-500 animate-pulse" />;
    };

    return (
        <aside className="w-96 border-l border-neutral-800 bg-neutral-900/80 backdrop-blur-xl flex flex-col z-20 shadow-2xl">
            <div className="p-5 border-b border-neutral-800">
                <h2 className="text-sm font-bold tracking-widest text-neutral-400">ACTIVE INCIDENTS</h2>
                <p className="text-xs text-neutral-500 font-mono mt-1">{incidents.length} events logged</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {incidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <CheckCircle size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">No Active Threats</p>
                    </div>
                ) : (
                    incidents.map(inc => (
                        <div
                            key={inc.incident_id}
                            onClick={() => onSelectIncident(inc)}
                            className={`p-4 rounded-xl border cursor-pointer hover:bg-neutral-800 transition-all ${getSeverityColors(inc.trigger_type, inc.operator_action)}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono font-bold">{inc.atm_id}</span>
                                {getStatusIcon(inc.operator_action)}
                            </div>

                            <div className="mb-3">
                                <h3 className="font-bold text-lg uppercase tracking-wide">
                                    {inc.trigger_type.replace('_', ' ')}
                                </h3>
                                {inc.threat_class && (
                                    <p className="text-xs opacity-80 flex items-center gap-1 mt-1 font-mono">
                                        <Target size={12} />
                                        Class: {inc.threat_class} {(inc.confidence_score * 100).toFixed(1)}%
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-xs opacity-60">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}
                                </span>
                                {inc.operator_action && (
                                    <span className="uppercase font-bold tracking-wider">{inc.operator_action}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}
