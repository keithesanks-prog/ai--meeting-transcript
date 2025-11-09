"""
Script to create user accounts from a meeting transcript.
Creates accounts for all participants mentioned in the transcript.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from backend import (
    ensure_data_dir, load_users, save_user, hash_password,
    get_user_by_email, VALID_ROLES
)
import uuid
from datetime import datetime

# Users from the transcript
USERS_TO_CREATE = [
    {
        "name": "Sarah",
        "email": "sarah@company.com",
        "role": "PM",
        "password": "password123",
        "is_admin": False
    },
    {
        "name": "Mark",
        "email": "mark@company.com",
        "role": "Design",
        "password": "password123",
        "is_admin": False
    },
    {
        "name": "John",
        "email": "john@company.com",
        "role": "Engineer",
        "password": "password123",
        "is_admin": False
    },
    {
        "name": "Tom",
        "email": "tom@company.com",
        "role": "Legal",
        "password": "password123",
        "is_admin": True  # Make Tom an admin
    }
]

def create_users():
    """Create user accounts from the transcript."""
    ensure_data_dir()
    users = load_users()
    created = []
    skipped = []
    
    for user_data in USERS_TO_CREATE:
        email = user_data["email"].lower()
        
        # Check if user already exists
        if get_user_by_email(email):
            print(f"⚠️  User {email} already exists, skipping...")
            skipped.append(email)
            continue
        
        # Create user
        user_id = str(uuid.uuid4())
        role = user_data["role"]
        if user_data.get("is_admin"):
            role = "Admin"
        
        new_user = {
            "email": email,
            "password_hash": hash_password(user_data["password"]),
            "name": user_data["name"],
            "role": role,
            "created_at": datetime.now().isoformat()
        }
        
        save_user(user_id, new_user)
        created.append({
            "name": user_data["name"],
            "email": email,
            "role": role,
            "password": user_data["password"]
        })
        print(f"✅ Created user: {user_data['name']} ({email}) - Role: {role}")
    
    print("\n" + "=" * 50)
    print(f"Created {len(created)} new users")
    if skipped:
        print(f"Skipped {len(skipped)} existing users")
    print("=" * 50)
    
    print("\n📋 User Credentials:")
    print("-" * 50)
    for user in created:
        admin_note = " (ADMIN)" if user["role"] == "Admin" else ""
        print(f"Email: {user['email']}")
        print(f"Password: {user['password']}")
        print(f"Role: {user['role']}{admin_note}")
        print("-" * 50)
    
    return created

if __name__ == "__main__":
    print("Creating user accounts from transcript...")
    print("=" * 50)
    create_users()

