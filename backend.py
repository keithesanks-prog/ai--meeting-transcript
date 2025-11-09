"""
Backend API server for AI Meeting Transcripts Action Tracker
Uses Gemini API to process transcripts and extract actions, decisions, and blockers.
Includes user authentication and authorization.
"""

import os
import json
import uuid
import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, List, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from action_tracker import format_prompt_with_transcript, validate_output, get_json_schema
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Try to import OpenAI for Whisper API (optional)
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI library not installed. Audio transcription will not be available.")

app = Flask(__name__)
CORS(app)

# Add security headers to all responses
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyAWXeYnVW31CDqLSj0172QxMbxlCkWLezg"
genai.configure(api_key=GEMINI_API_KEY)

# Configure OpenAI for Whisper API (optional - set OPENAI_API_KEY environment variable)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
if OPENAI_AVAILABLE and OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None
    if OPENAI_AVAILABLE:
        print("Warning: OPENAI_API_KEY not set. Audio transcription will not be available.")

# Email configuration (set via environment variables)
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', SMTP_USERNAME)
EMAIL_ENABLED = bool(SMTP_USERNAME and SMTP_PASSWORD)

# JWT Secret Key (in production, use environment variable)
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Valid user roles
VALID_ROLES = [
    'Engineer',
    'Admin',
    'Design',
    'PM',
    'Legal',
    'Marketing',
    'Sales',
    'Product',
    'Operations',
    'Finance',
    'HR',
    'Support',
    'Other'
]

# Simple file-based storage (can be replaced with Firebase/Supabase)
STORAGE_FILE = "data/meetings.json"
USERS_FILE = "data/users.json"


def ensure_data_dir():
    """Ensure the data directory exists."""
    os.makedirs("data", exist_ok=True)


# ==================== USER MANAGEMENT ====================

def load_users() -> Dict[str, Any]:
    """Load all users from storage."""
    ensure_data_dir()
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_user(user_id: str, user_data: Dict[str, Any]):
    """Save a user to storage."""
    try:
        ensure_data_dir()
        users = load_users()
        users[user_id] = user_data
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        raise Exception(f"Failed to save user: {str(e)}")


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get a user by email."""
    users = load_users()
    for user_id, user_data in users.items():
        if user_data.get('email') == email:
            return {**user_data, 'id': user_id}
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get a user by ID."""
    users = load_users()
    user_data = users.get(user_id)
    if user_data:
        return {**user_data, 'id': user_id}
    return None


def get_user_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Get a user by name (case-insensitive)."""
    users = load_users()
    name_lower = name.lower().strip()
    for user_id, user_data in users.items():
        if user_data.get('name', '').lower() == name_lower:
            return {**user_data, 'id': user_id}
    return None


def validate_owner_exists(owner_name: str) -> bool:
    """Check if an owner name matches an existing user."""
    if owner_name == 'UNASSIGNED':
        return True
    return get_user_by_name(owner_name) is not None


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    try:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    except Exception as e:
        raise Exception(f"Failed to hash password: {str(e)}")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_token(user_id: str, email: str) -> str:
    """Generate a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    # Ensure token is a string (PyJWT 2.x returns string, older versions return bytes)
    if isinstance(token, bytes):
        return token.decode('utf-8')
    return token


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user() -> Optional[Dict[str, Any]]:
    """Get the current user from the Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    try:
        token = auth_header.split(' ')[1]  # Format: "Bearer <token>"
        payload = verify_token(token)
        if payload:
            return get_user_by_id(payload['user_id'])
    except (IndexError, KeyError):
        pass
    
    return None


def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def require_admin(f):
    """Decorator to require admin role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        if user.get('role') != 'Admin':
            return jsonify({"error": "Admin access required"}), 403
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function


# ==================== MEETING MANAGEMENT ====================

def load_meetings() -> Dict[str, Any]:
    """Load all meetings from storage."""
    ensure_data_dir()
    if os.path.exists(STORAGE_FILE):
        with open(STORAGE_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_meeting(meeting_id: str, data: Dict[str, Any]):
    """Save a meeting to storage."""
    ensure_data_dir()
    meetings = load_meetings()
    meetings[meeting_id] = data
    with open(STORAGE_FILE, 'w') as f:
        json.dump(meetings, f, indent=2)


def get_meeting(meeting_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific meeting by ID."""
    meetings = load_meetings()
    return meetings.get(meeting_id)


def process_transcript_with_gemini(transcript: str) -> Dict[str, Any]:
    """
    Process a transcript using Gemini API and return structured JSON.
    
    Args:
        transcript: Raw meeting transcript text
        
    Returns:
        Structured JSON with actions, decisions, and blockers
    """
    try:
        # Get list of available users for owner matching
        users = load_users()
        user_names = [user_data.get('name') for user_data in users.values() if user_data.get('name')]
        users_list = ', '.join(user_names) if user_names else 'None'
        
        # Format the prompt with user list
        base_prompt = format_prompt_with_transcript(transcript)
        prompt = f"""{base_prompt}

### IMPORTANT - Available Users:
The following users exist in the system. When assigning owners, use EXACTLY these names (case-sensitive):
{users_list}

If a person mentioned in the transcript matches one of these names, use that exact name. If no match is found, set owner to "UNASSIGNED".
"""
        
        # Initialize Gemini model - use gemini-2.5-flash (stable, fast, cost-effective)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate response
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 8192,
            }
        )
        
        # Extract JSON from response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON
        result = json.loads(response_text)
        
        # Validate output
        if not validate_output(result):
            raise ValueError("Output does not match expected schema")
        
        # Add source_line to each action if not present and validate owners
        transcript_lines = transcript.split('\n')
        for action in result.get('actions', []):
            if 'source_line' not in action:
                # Try to find the source line in transcript
                description = action.get('description', '').lower()
                for i, line in enumerate(transcript_lines):
                    if description[:50] in line.lower() or any(word in line.lower() for word in description.split()[:5]):
                        action['source_line'] = line.strip()
                        break
                if 'source_line' not in action:
                    action['source_line'] = ""
            
            # Validate owner exists - if not, set to UNASSIGNED
            owner = action.get('owner', 'UNASSIGNED')
            if owner != 'UNASSIGNED' and not validate_owner_exists(owner):
                # Try to find user by partial name match
                users = load_users()
                found_user = None
                for user_id, user_data in users.items():
                    user_name = user_data.get('name', '').lower()
                    if owner.lower() in user_name or user_name in owner.lower():
                        found_user = user_data.get('name')
                        break
                
                if found_user:
                    action['owner'] = found_user
                else:
                    action['owner'] = 'UNASSIGNED'
        
        # Calculate summary if not present
        if 'summary' not in result:
            actions = result.get('actions', [])
            result['summary'] = {
                'total_actions': sum(1 for a in actions if a.get('intent') == 'ACTION'),
                'total_decisions': sum(1 for a in actions if a.get('intent') == 'DECISION'),
                'total_blockers': sum(1 for a in actions if a.get('intent') == 'BLOCKER'),
                'unassigned_actions': sum(1 for a in actions if a.get('owner') == 'UNASSIGNED')
            }
        
        return result
        
    except Exception as e:
        raise Exception(f"Error processing transcript with Gemini: {str(e)}")


# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        
        data = request.json
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        role = data.get('role', '').strip()
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        if not role:
            return jsonify({"error": "Role is required"}), 400
        
        if role not in VALID_ROLES:
            return jsonify({
                "error": f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"
            }), 400
        
        # Check if user already exists
        if get_user_by_email(email):
            return jsonify({"error": "User with this email already exists"}), 409
        
        # Create new user
        user_id = str(uuid.uuid4())
        user_data = {
            "email": email,
            "password_hash": hash_password(password),
            "name": name or email.split('@')[0],
            "role": role,
            "created_at": datetime.now().isoformat()
        }
        
        save_user(user_id, user_data)
        
        # Generate token
        token = generate_token(user_id, email)
        
        return jsonify({
            "token": token,
            "user": {
                "id": user_id,
                "email": email,
                "name": user_data["name"],
                "role": role
            }
        }), 201
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_message = str(e)
        
        # Log the full error for debugging
        print("=" * 50)
        print(f"Registration error: {error_message}")
        print(error_trace)
        print("=" * 50)
        
        # Return more detailed error message
        if "password_hash" in error_message.lower() or "bcrypt" in error_message.lower():
            user_friendly_message = "Error hashing password. Please try again."
        elif "token" in error_message.lower() or "jwt" in error_message.lower():
            user_friendly_message = "Error generating authentication token. Please try again."
        elif "json" in error_message.lower() or "file" in error_message.lower():
            user_friendly_message = "Error saving user data. Please check file permissions."
        else:
            user_friendly_message = f"Registration failed: {error_message}"
        
        try:
            return jsonify({"error": user_friendly_message}), 500
        except Exception as json_error:
            # If even JSON encoding fails, return a simple text response
            print(f"Failed to return JSON error: {json_error}")
            from flask import Response
            return Response(
                f'{{"error": "{user_friendly_message}"}}',
                status=500,
                mimetype='application/json'
            )


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login a user."""
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        
        data = request.json
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        user = get_user_by_email(email)
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Check if password_hash exists
        if 'password_hash' not in user:
            return jsonify({"error": "Invalid user data"}), 500
        
        if not verify_password(password, user['password_hash']):
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Generate token
        token = generate_token(user['id'], email)
        
        return jsonify({
            "token": token,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user.get('name', ''),
                "role": user.get('role', 'Other')
            }
        }), 200
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print("=" * 50)
        print(f"Login error: {str(e)}")
        print(error_trace)
        print("=" * 50)
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user_info():
    """Get current user information."""
    user = get_current_user()
    return jsonify({
        "id": user['id'],
        "email": user['email'],
        "name": user['name'],
        "role": user.get('role', 'Other')
    }), 200


# ==================== MEETING ENDPOINTS ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


@app.route('/api/transcribe', methods=['POST'])
@require_admin
def transcribe_audio():
    """
    Transcribe audio file to text using Whisper API.
    Requires admin access.
    """
    try:
        if not OPENAI_AVAILABLE or not openai_client:
            return jsonify({
                "error": "Audio transcription not available. Please install openai package and set OPENAI_API_KEY environment variable."
            }), 503
        
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file type
        allowed_extensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm']
        file_ext = os.path.splitext(audio_file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({
                "error": f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
            }), 400
        
        # Save temporary file
        temp_file_path = f"data/temp_{uuid.uuid4()}{file_ext}"
        ensure_data_dir()
        audio_file.save(temp_file_path)
        
        try:
            # Transcribe using Whisper API
            with open(temp_file_path, 'rb') as audio:
                transcript_response = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    language="en"  # Optional: can be auto-detected
                )
            
            transcript_text = transcript_response.text
            
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
            return jsonify({
                "transcript": transcript_text,
                "model": "whisper-1"
            }), 200
            
        except Exception as e:
            # Clean up temporary file on error
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            raise e
        
    except Exception as e:
        import traceback
        print(f"Transcription error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500


@app.route('/api/process', methods=['POST'])
@require_admin
def process_transcript():
    """
    Process a meeting transcript and extract actions, decisions, and blockers.
    Requires admin access. The authenticated admin becomes the meeting owner.
    """
    try:
        user = get_current_user()
        data = request.json
        transcript = data.get('transcript', '').strip()
        
        if not transcript:
            return jsonify({"error": "Transcript is required"}), 400
        
        # Process transcript
        result = process_transcript_with_gemini(transcript)
        
        # Create meeting record with owner
        meeting_id = str(uuid.uuid4())
        meeting_data = {
            "id": meeting_id,
            "title": data.get('title', 'Untitled Meeting'),
            "transcript": transcript,
            "owner_id": user['id'],
            "owner_email": user['email'],
            "owner_name": user['name'],
            "processed_at": datetime.now().isoformat(),
            "actions": result.get('actions', []),
            "summary": result.get('summary', {})
        }
        
        # Save to storage
        save_meeting(meeting_id, meeting_data)
        
        return jsonify(meeting_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/meetings', methods=['GET'])
@require_auth
def list_meetings():
    """Get all meetings for the current user."""
    user = get_current_user()
    meetings = load_meetings()
    
    # Filter meetings by owner
    user_meetings = [
        meeting for meeting in meetings.values()
        if meeting.get('owner_id') == user['id']
    ]
    
    return jsonify(user_meetings), 200


@app.route('/api/meetings/<meeting_id>', methods=['GET'])
@require_auth
def get_meeting_by_id(meeting_id: str):
    """Get a specific meeting by ID. Only accessible by the owner."""
    user = get_current_user()
    meeting = get_meeting(meeting_id)
    
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    
    # Check ownership
    if meeting.get('owner_id') != user['id']:
        return jsonify({"error": "Access denied"}), 403
    
    return jsonify(meeting), 200


@app.route('/api/meetings/<meeting_id>', methods=['DELETE'])
@require_auth
def delete_meeting(meeting_id: str):
    """
    Delete a meeting. Only accessible by the meeting owner or admins.
    """
    user = get_current_user()
    meeting = get_meeting(meeting_id)
    
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    
    # Check ownership or admin role
    is_owner = meeting.get('owner_id') == user['id']
    is_admin = user.get('role') == 'Admin'
    
    if not is_owner and not is_admin:
        return jsonify({"error": "Access denied. Only the meeting owner or admins can delete meetings."}), 403
    
    # Delete the meeting
    meetings = load_meetings()
    if meeting_id in meetings:
        del meetings[meeting_id]
        ensure_data_dir()
        with open(STORAGE_FILE, 'w') as f:
            json.dump(meetings, f, indent=2)
    
    return jsonify({"message": "Meeting deleted successfully"}), 200


@app.route('/api/meetings/<meeting_id>/actions/<action_id>', methods=['PATCH'])
@require_auth
def update_action(meeting_id: str, action_id: str):
    """
    Update an action (e.g., move to Kanban column, update status).
    Only the task owner can update their own tasks.
    """
    user = get_current_user()
    meeting = get_meeting(meeting_id)
    
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    
    # Check meeting ownership
    if meeting.get('owner_id') != user['id']:
        return jsonify({"error": "Access denied"}), 403
    
    data = request.json
    actions = meeting.get('actions', [])
    
    # Find the action
    action = None
    for a in actions:
        if a.get('id') == action_id:
            action = a
            break
    
    if not action:
        return jsonify({"error": "Action not found"}), 404
    
    # Check if user is the task owner
    task_owner = action.get('owner', '')
    user_name = user.get('name', '')
    user_email = user.get('email', '')
    
    # Allow update if:
    # 1. User is the meeting owner (can update any task), OR
    # 2. User is the task owner (can update their own tasks)
    is_meeting_owner = meeting.get('owner_id') == user['id']
    is_task_owner = (
        task_owner == user_name or
        task_owner == user_email or
        task_owner.lower() == user_name.lower() or
        task_owner.lower() == user_email.lower()
    )
    
    if not (is_meeting_owner or is_task_owner):
        return jsonify({
            "error": "You can only update tasks assigned to you",
            "task_owner": task_owner,
            "your_name": user_name
        }), 403
    
    # Update action
    action.update(data)
    save_meeting(meeting_id, meeting)
    
    return jsonify(action), 200


@app.route('/api/meetings/<meeting_id>/export', methods=['GET'])
@require_auth
def export_meeting(meeting_id: str):
    """
    Export meeting in various formats.
    Only accessible by the meeting owner.
    """
    user = get_current_user()
    meeting = get_meeting(meeting_id)
    
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    
    # Check ownership
    if meeting.get('owner_id') != user['id']:
        return jsonify({"error": "Access denied"}), 403
    
    export_format = request.args.get('format', 'full')
    actions = meeting.get('actions', [])
    
    if export_format == 'decisions':
        decisions = [a for a in actions if a.get('intent') == 'DECISION']
        return jsonify({
            "title": meeting.get('title'),
            "decisions": decisions,
            "summary": meeting.get('summary', {})
        }), 200
    
    elif export_format == 'owner':
        owner = request.args.get('owner')
        if not owner:
            return jsonify({"error": "Owner parameter required"}), 400
        
        owner_actions = [a for a in actions if a.get('owner') == owner]
        return jsonify({
            "owner": owner,
            "actions": owner_actions,
            "count": len(owner_actions)
        }), 200
    
    else:
        return jsonify(meeting), 200


@app.route('/api/meetings/<meeting_id>/share', methods=['POST'])
@require_auth
def create_shareable_link(meeting_id: str):
    """
    Create a shareable read-only link for the meeting.
    Only accessible by the meeting owner.
    """
    user = get_current_user()
    meeting = get_meeting(meeting_id)
    
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    
    # Check ownership
    if meeting.get('owner_id') != user['id']:
        return jsonify({"error": "Access denied"}), 403
    
    share_token = str(uuid.uuid4())
    meeting['share_token'] = share_token
    save_meeting(meeting_id, meeting)
    
    return jsonify({
        "share_url": f"/share/{share_token}",
        "token": share_token
    }), 200


def send_email(to_emails: List[str], subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Send an email using SMTP.
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body (optional)
        
    Returns:
        True if successful, False otherwise
    """
    if not EMAIL_ENABLED:
        print("Email not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = ', '.join(to_emails)
        
        # Add text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, 'plain')
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


@app.route('/api/meetings/<meeting_id>/email', methods=['POST'])
@require_auth
def send_meeting_email(meeting_id: str):
    """
    Send meeting summary via email to selected recipients.
    Only accessible by the meeting owner or admins.
    """
    user = get_current_user()
    meeting = get_meeting(meeting_id)
    
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    
    # Check ownership or admin role
    is_owner = meeting.get('owner_id') == user['id']
    is_admin = user.get('role') == 'Admin'
    
    if not is_owner and not is_admin:
        return jsonify({"error": "Access denied"}), 403
    
    if not EMAIL_ENABLED:
        return jsonify({
            "error": "Email not configured. Please set SMTP_USERNAME and SMTP_PASSWORD environment variables."
        }), 503
    
    data = request.json
    recipient_emails = data.get('emails', [])
    email_type = data.get('type', 'summary')  # 'summary', 'decisions', 'actions', 'full'
    
    if not recipient_emails or not isinstance(recipient_emails, list):
        return jsonify({"error": "Recipient emails are required"}), 400
    
    # Validate email addresses
    import re
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    valid_emails = [email for email in recipient_emails if email_pattern.match(email)]
    
    if not valid_emails:
        return jsonify({"error": "No valid email addresses provided"}), 400
    
    # Format email content
    actions = meeting.get('actions', [])
    summary = meeting.get('summary', {})
    
    # Build HTML email
    html_parts = [
        f"<h2>{meeting.get('title', 'Meeting Summary')}</h2>",
        f"<p><strong>Date:</strong> {meeting.get('processed_at', '')}</p>",
        f"<p><strong>Processed by:</strong> {meeting.get('owner_name', 'Unknown')}</p>",
        "<hr>"
    ]
    
    if email_type in ['summary', 'full']:
        html_parts.append("<h3>Summary</h3>")
        html_parts.append(f"<ul>")
        html_parts.append(f"<li><strong>Total Actions:</strong> {summary.get('total_actions', 0)}</li>")
        html_parts.append(f"<li><strong>Decisions:</strong> {summary.get('total_decisions', 0)}</li>")
        html_parts.append(f"<li><strong>Blockers:</strong> {summary.get('total_blockers', 0)}</li>")
        html_parts.append(f"<li><strong>Unassigned Actions:</strong> {summary.get('unassigned_actions', 0)}</li>")
        html_parts.append(f"</ul>")
    
    if email_type in ['decisions', 'full']:
        decisions = [a for a in actions if a.get('intent') == 'DECISION']
        if decisions:
            html_parts.append("<h3>Key Decisions</h3>")
            html_parts.append("<ul>")
            for i, decision in enumerate(decisions, 1):
                html_parts.append(f"<li><strong>{i}.</strong> {decision.get('description', 'N/A')}</li>")
            html_parts.append("</ul>")
    
    if email_type in ['actions', 'full']:
        action_items = [a for a in actions if a.get('intent') == 'ACTION']
        if action_items:
            html_parts.append("<h3>Action Items</h3>")
            html_parts.append("<ul>")
            for i, action in enumerate(action_items, 1):
                owner = action.get('owner', 'UNASSIGNED')
                html_parts.append(
                    f"<li><strong>{i}.</strong> {action.get('description', 'N/A')} "
                    f"<em>(Owner: {owner})</em></li>"
                )
            html_parts.append("</ul>")
    
    blockers = [a for a in actions if a.get('intent') == 'BLOCKER']
    if blockers and email_type in ['full']:
        html_parts.append("<h3>Blockers</h3>")
        html_parts.append("<ul>")
        for i, blocker in enumerate(blockers, 1):
            html_parts.append(f"<li><strong>{i}.</strong> {blocker.get('description', 'N/A')}</li>")
        html_parts.append("</ul>")
    
    html_body = "<html><body>" + "".join(html_parts) + "</body></html>"
    
    # Create plain text version
    text_parts = [
        f"{meeting.get('title', 'Meeting Summary')}",
        f"Date: {meeting.get('processed_at', '')}",
        f"Processed by: {meeting.get('owner_name', 'Unknown')}",
        "",
        "---"
    ]
    
    if email_type in ['summary', 'full']:
        text_parts.append("Summary:")
        text_parts.append(f"  - Total Actions: {summary.get('total_actions', 0)}")
        text_parts.append(f"  - Decisions: {summary.get('total_decisions', 0)}")
        text_parts.append(f"  - Blockers: {summary.get('total_blockers', 0)}")
        text_parts.append(f"  - Unassigned Actions: {summary.get('unassigned_actions', 0)}")
        text_parts.append("")
    
    if email_type in ['decisions', 'full']:
        decisions = [a for a in actions if a.get('intent') == 'DECISION']
        if decisions:
            text_parts.append("Key Decisions:")
            for i, decision in enumerate(decisions, 1):
                text_parts.append(f"  {i}. {decision.get('description', 'N/A')}")
            text_parts.append("")
    
    if email_type in ['actions', 'full']:
        action_items = [a for a in actions if a.get('intent') == 'ACTION']
        if action_items:
            text_parts.append("Action Items:")
            for i, action in enumerate(action_items, 1):
                owner = action.get('owner', 'UNASSIGNED')
                text_parts.append(f"  {i}. {action.get('description', 'N/A')} (Owner: {owner})")
            text_parts.append("")
    
    blockers = [a for a in actions if a.get('intent') == 'BLOCKER']
    if blockers and email_type in ['full']:
        text_parts.append("Blockers:")
        for i, blocker in enumerate(blockers, 1):
            text_parts.append(f"  {i}. {blocker.get('description', 'N/A')}")
        text_parts.append("")
    
    text_body = "\n".join(text_parts)
    
    # Send email
    subject = f"Meeting Summary: {meeting.get('title', 'Untitled Meeting')}"
    success = send_email(valid_emails, subject, html_body, text_body)
    
    if success:
        return jsonify({
            "message": f"Email sent successfully to {len(valid_emails)} recipient(s)",
            "recipients": valid_emails
        }), 200
    else:
        return jsonify({"error": "Failed to send email. Please check server logs."}), 500


# ==================== ADMIN ENDPOINTS ====================

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def list_all_users():
    """List all users. Admin only."""
    users = load_users()
    # Return user list without password hashes
    user_list = []
    for user_id, user_data in users.items():
        user_list.append({
            "id": user_id,
            "email": user_data.get('email'),
            "name": user_data.get('name'),
            "role": user_data.get('role', 'Other'),
            "created_at": user_data.get('created_at')
        })
    return jsonify(user_list), 200


@app.route('/api/admin/users/<user_id>/role', methods=['PATCH'])
@require_admin
def update_user_role(user_id: str):
    """
    Update a user's role/department. Admin only.
    
    Expected JSON body:
    {
        "role": "Engineer" | "Design" | "PM" | etc.
    }
    """
    data = request.json
    new_role = data.get('role', '').strip()
    
    if not new_role:
        return jsonify({"error": "Role is required"}), 400
    
    if new_role not in VALID_ROLES:
        return jsonify({
            "error": f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"
        }), 400
    
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update user role
    users = load_users()
    if user_id in users:
        users[user_id]['role'] = new_role
        save_user(user_id, users[user_id])
        
        return jsonify({
            "id": user_id,
            "email": users[user_id].get('email'),
            "name": users[user_id].get('name'),
            "role": new_role
        }), 200
    
    return jsonify({"error": "User not found"}), 404


@app.route('/api/admin/users/<user_id>/password', methods=['POST'])
@require_admin
def reset_user_password(user_id: str):
    """
    Reset a user's password. Admin only.
    
    Expected JSON body:
    {
        "password": "new_password_here"
    }
    """
    data = request.json
    new_password = data.get('password', '').strip()
    
    if not new_password:
        return jsonify({"error": "Password is required"}), 400
    
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update password
    users = load_users()
    if user_id in users:
        users[user_id]['password_hash'] = hash_password(new_password)
        save_user(user_id, users[user_id])
    
    return jsonify({
        "message": "Password reset successfully",
        "user": {
            "id": user_id,
            "email": users[user_id].get('email'),
            "name": users[user_id].get('name')
        }
    }), 200


# ==================== USER PROFILE ENDPOINTS ====================

@app.route('/api/users/<user_id>/tasks', methods=['GET'])
@require_auth
def get_user_tasks(user_id: str):
    """
    Get all tasks assigned to a specific user across all meetings.
    Only accessible by the user themselves or admins.
    """
    current_user = get_current_user()
    
    # Check if user is accessing their own tasks or is an admin
    if current_user['id'] != user_id and current_user.get('role') != 'Admin':
        return jsonify({"error": "Access denied"}), 403
    
    # Get all meetings
    meetings = load_meetings()
    user_tasks = []
    
    # Get user info
    target_user = get_user_by_id(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), 404
    
    user_name = target_user.get('name')
    
    # Collect all tasks assigned to this user
    for meeting_id, meeting in meetings.items():
        actions = meeting.get('actions', [])
        for action in actions:
            # Match by name (case-insensitive)
            owner = action.get('owner', '')
            if owner.lower() == user_name.lower():
                task_with_meeting = {
                    **action,
                    'meeting_id': meeting_id,
                    'meeting_title': meeting.get('title', 'Untitled Meeting'),
                    'meeting_date': meeting.get('processed_at')
                }
                user_tasks.append(task_with_meeting)
    
    # Sort by meeting date (newest first)
    user_tasks.sort(key=lambda x: x.get('meeting_date', ''), reverse=True)
    
    return jsonify({
        "user": {
            "id": user_id,
            "name": user_name,
            "email": target_user.get('email'),
            "role": target_user.get('role')
        },
        "tasks": user_tasks,
        "count": len(user_tasks)
    }), 200


@app.route('/api/users/me/tasks', methods=['GET'])
@require_auth
def get_my_tasks():
    """Get all tasks assigned to the current user."""
    current_user = get_current_user()
    return get_user_tasks(current_user['id'])


@app.route('/api/users/by-name/<name>', methods=['GET'])
@require_auth
def get_user_by_name_endpoint(name: str):
    """Get user ID by name. Used for linking to profiles."""
    user = get_user_by_name(name)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user['id'],
        "name": user.get('name'),
        "email": user.get('email'),
        "role": user.get('role')
    }), 200


if __name__ == '__main__':
    ensure_data_dir()
    app.run(debug=True, port=5000)
