import json
import random

with open('data/synthetic_tickets.json', 'r') as f:
    tickets = json.load(f)

new_entries = [
    {
        "title": "Irrigation canal blocked by debris (Report #811)",
        "description": "The main canal supplying water to our fields is completely blocked with plastic and mud. Crops are drying.",
        "domain": "agriculture",
        "severity_score": 0.85,
        "rationale": "High priority due to immediate threat to livelihood and crops.",
        "location": {
            "lat": 24.2 + random.uniform(-0.1, 0.1),
            "long": 84.3 + random.uniform(-0.1, 0.1)
        }
    },
    {
        "title": "Pesticide quality is very poor (Report #812)",
        "description": "The pesticide distributed by the local panchayat is fake, bugs are eating all the wheat.",
        "domain": "agriculture",
        "severity_score": 0.70,
        "rationale": "Medium-high priority affecting agricultural output.",
        "location": {
            "lat": 24.2 + random.uniform(-0.1, 0.1),
            "long": 84.3 + random.uniform(-0.1, 0.1)
        }
    },
    {
        "title": "Tractor subsidy not received (Report #813)",
        "description": "I applied for the tractor subsidy 8 months ago and my application is stuck at the BDO office without any reason.",
        "domain": "agriculture",
        "severity_score": 0.50,
        "rationale": "Medium priority administrative delay.",
        "location": {
            "lat": 24.2 + random.uniform(-0.1, 0.1),
            "long": 84.3 + random.uniform(-0.1, 0.1)
        }
    },
    {
        "title": "Unseasonal rain damaged crops (Report #814)",
        "description": "Due to heavy hail and rain, entire paddy field is destroyed. We need crop insurance survey immediately.",
        "domain": "agriculture",
        "severity_score": 0.90,
        "rationale": "High priority disaster response needed for farmers.",
        "location": {
            "lat": 24.2 + random.uniform(-0.1, 0.1),
            "long": 84.3 + random.uniform(-0.1, 0.1)
        }
    }
]

tickets.extend(new_entries)

with open('data/synthetic_tickets.json', 'w') as f:
    json.dump(tickets, f, indent=2)

print(f"Added {len(new_entries)} agriculture tickets. Total is now {len(tickets)}.")
