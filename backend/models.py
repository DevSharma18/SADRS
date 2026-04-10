from app import db
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class AtmUnit(db.Model):
    __tablename__ = 'atm_units'
    atm_id = db.Column(db.String(50), primary_key=True)
    location_name = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default='offline') # online/offline/incident
    last_heartbeat = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "atm_id": self.atm_id,
            "location_name": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None
        }

class Incident(db.Model):
    __tablename__ = 'incidents'
    incident_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    atm_id = db.Column(db.String(50), db.ForeignKey('atm_units.atm_id'), nullable=False)
    trigger_type = db.Column(db.String(50), nullable=False) # panic_pin, ml_cctv, tamper
    threat_class = db.Column(db.String(50), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    sensor_snapshot = db.Column(db.JSON, nullable=True)
    claude_summary = db.Column(db.Text, nullable=True)
    operator_action = db.Column(db.String(20), nullable=True) # confirmed/dismissed/escalated
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "incident_id": self.incident_id,
            "atm_id": self.atm_id,
            "trigger_type": self.trigger_type,
            "threat_class": self.threat_class,
            "confidence_score": self.confidence_score,
            "sensor_snapshot": self.sensor_snapshot,
            "claude_summary": self.claude_summary,
            "operator_action": self.operator_action,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
