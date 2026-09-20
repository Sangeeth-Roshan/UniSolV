import sys

with open('../README.md', 'r') as f:
    content = f.read()

migration_text = """## Database Migrations

When setting up the database, ensure you run migrations all the way to `head`. The migration chain is as follows:
- `0001_initial_schema`: Base tables.
- `0002_add_roles`: Role enums.
- `c8cfcd496f41`: Adds `public_good_consent` to `tickets` (missing from `0001`).
- Subsequent migrations for hotspots and routing (e.g. `routing_shortlist`).

Always run `alembic upgrade head` rather than stopping at `0001`.

## dYs? Running Locally with Docker Compose"""

content = content.replace("## dYs? Running Locally with Docker Compose", migration_text)

with open('../README.md', 'w') as f:
    f.write(content)
print("README updated.")
