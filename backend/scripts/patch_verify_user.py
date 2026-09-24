import sys

with open('scripts/verify_crit2_3_5.py', 'r') as f:
    content = f.read()

# Replace user_id logic to fetch correctly
old_user_logic = "user_id = 2 if ticket.assigned_institution_id == 1 else 3"
new_user_logic = """if ticket.assigned_institution_id == 10:
            user_id = 10
        else:
            user_id = 2 if ticket.assigned_institution_id == 1 else 3"""

content = content.replace(old_user_logic, new_user_logic)

# Replace it inside run_scenario_sequential too (which used ticket_after_esc)
old_seq_user_logic = "user_id = 2 if ticket_after_esc.assigned_institution_id == 1 else 3"
new_seq_user_logic = """if ticket_after_esc.assigned_institution_id == 10:
            user_id = 10
        else:
            user_id = 2 if ticket_after_esc.assigned_institution_id == 1 else 3"""

content = content.replace(old_seq_user_logic, new_seq_user_logic)

with open('scripts/verify_crit2_3_5.py', 'w') as f:
    f.write(content)
print("Updated verify_crit2_3_5.py user mapping")
