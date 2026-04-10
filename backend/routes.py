from flask import Blueprint, request, jsonify
from flask import Blueprint, request, jsonify, send_from_directory, Response
from datetime import datetime
import os
from app import db, socketio
from models import AtmUnit, Incident
from claude_analyst import ClaudeAnalyst

main_bp = Blueprint('main', __name__)
claude_analyst = ClaudeAnalyst()

api = Blueprint('api', __name__)

# To make evidence clips accessible to frontend (served statically for demo/local)
EVIDENCE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'edge', 'evidence'))

@api.route('/api/v1/evidence/<filename>')
def serve_evidence(filename):
    return send_from_directory(EVIDENCE_DIR, filename)

@api.route('/api/v1/heartbeat', methods=['POST'])
def heartbeat():
    data = request.json
    atm_id = data.get('atm_id')
    status = data.get('status', 'online')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    location_name = data.get('location_name')

    if not atm_id:
        return jsonify({"error": "Missing atm_id"}), 400

    atm = AtmUnit.query.get(atm_id)
    if not atm:
        atm = AtmUnit(atm_id=atm_id, status=status,
                      latitude=latitude, longitude=longitude,
                      location_name=location_name)
        db.session.add(atm)
    else:
        atm.status = status
        atm.last_heartbeat = datetime.utcnow()
        # Always update location if provided
        if latitude is not None:
            atm.latitude = latitude
        if longitude is not None:
            atm.longitude = longitude
        if location_name:
            atm.location_name = location_name
    
    db.session.commit()
    
    # Emit status update to dashboard (includes lat/lng now)
    socketio.emit('atm_status_update', atm.to_dict())
    
    return jsonify({"message": "Heartbeat registered"}), 200

@main_bp.route('/api/v1/incidents', methods=['POST'])
def create_incident():
    data = request.json
    atm_id = data.get('atm_id')
    trigger_type = data.get('trigger_type')
    threat_class = data.get('threat_class')
    conf = data.get('confidence_score')
    snapshot = data.get('sensor_snapshot')

    if not atm_id or not trigger_type:
        return jsonify({"error": "Missing required fields"}), 400

    # Ensure ATM exists in DB
    atm = AtmUnit.query.get(atm_id)
    if not atm:
        atm = AtmUnit(atm_id=atm_id, status='incident')
        db.session.add(atm)
    else:
        atm.status = 'incident'
    db.session.commit()

    # Generate Analyst Summary via Claude
    summary = claude_analyst.generate_incident_summary(atm_id, trigger_type, threat_class, conf, snapshot)

    # Save Incident
    incident = Incident(
        atm_id=atm_id,
        trigger_type=trigger_type,
        threat_class=threat_class,
        confidence_score=conf,
        sensor_snapshot=snapshot,
        claude_summary=summary
    )
    db.session.add(incident)
    db.session.commit()

    # Broadcast to Dashboard
    incident_data = incident.to_dict()
    socketio.emit('new_incident', incident_data)
    socketio.emit('atm_status_update', atm.to_dict())

    return jsonify({"message": "Incident logged successfully", "incident_id": incident.incident_id}), 201

@main_bp.route('/api/v1/incidents', methods=['GET'])
def get_incidents():
    incidents = Incident.query.order_by(Incident.created_at.desc()).limit(50).all()
    return jsonify([i.to_dict() for i in incidents]), 200

@api.route('/api/v1/atms', methods=['GET'])
def get_atms():
    atms = AtmUnit.query.all()
    return jsonify([{'atm_id': a.atm_id, 'status': a.status, 'latitude': a.latitude, 'longitude': a.longitude, 'location_name': a.location_name} for a in atms]), 200

# Video feed is now served directly from the edge stream server (port 8080).
# The /video_feed and /snapshot endpoints have been removed.

@main_bp.route('/api/v1/incidents/<incident_id>/action', methods=['PATCH'])
def update_incident_action(incident_id):
    data = request.json
    action = data.get('operator_action')
    
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Not found"}), 404
        
    incident.operator_action = action
    db.session.commit()
    
    # Update dashboard
    socketio.emit('incident_updated', incident.to_dict())
    
    # Revert ATM status if cleared
    if action in ['dismissed']:
        atm = AtmUnit.query.get(incident.atm_id)
        if atm:
            atm.status = 'online'
            db.session.commit()
            socketio.emit('atm_status_update', atm.to_dict())
            
    return jsonify(incident.to_dict()), 200
