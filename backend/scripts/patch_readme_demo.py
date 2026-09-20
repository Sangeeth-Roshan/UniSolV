import sys

demo_text = """
---

## Demo & Analytics

### Seeding Data
To populate a realistic dataset (including institutions, users, mapped hotspots, and escalated tickets) for the demo, run the seed script:
```bash
cd backend
python scripts/seed_demo.py
```

### Analytics Dashboard
Once seeded, you can view the rich analytics dashboard locally at:
http://localhost:3000/dashboard/government/analytics

### Toggling Classifier Mode
You can hot-swap the ML classification backend between `cached` and `live` (LLM) modes without restarting the server via the admin API:
```bash
curl -X POST http://localhost:8000/api/admin/classifier-mode \\
  -H "Authorization: Bearer <GOV_OFFICER_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"mode": "live"}'
```

### Demo Credentials
After running the seed script, you can log in with:

**Citizen:**
- Email: `citizen@test.com`
- Password: `demo123`

**Government Officer (Admin/Analytics access):**
- Email: `admin@gov.in`
- Password: `demo123`
"""

with open('../README.md', 'a') as f:
    f.write(demo_text)

print("README appended successfully.")
