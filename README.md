# AI Meeting Transcripts - Action Tracker

An AI-powered full-stack application that transforms passive meeting transcripts into active, collaborative, and visual project management artifacts. Extract actions, decisions, and blockers from meeting transcripts using Google's Gemini AI, then manage them through an intuitive Kanban board interface.

## 🎯 Overview

This application takes raw meeting transcripts (text or audio) and uses AI to automatically extract:
- **Actions**: Tasks assigned to specific owners
- **Decisions**: Key decisions made during the meeting
- **Blockers**: Obstacles or risks that need attention

The extracted items are then organized into a visual dashboard with filtering, workload distribution, and workflow management capabilities.

## ✨ Key Features

### 🎤 Audio Transcription
- **Record Meetings**: Record audio directly in the browser using your microphone
- **Upload Audio Files**: Upload MP3, MP4, WAV, WebM, or M4A files
- **Automatic Transcription**: Uses OpenAI Whisper API for accurate speech-to-text conversion
- **Admin Only**: Audio transcription is available to administrators

### 🔐 User Authentication & Authorization
- **Secure Login/Signup**: JWT-based authentication system
- **Role-Based Access**: Users have roles (Engineer, Admin, Design, PM, Legal, etc.)
- **User Isolation**: Each user only sees their own meetings
- **Meeting Ownership**: The person who uploads a transcript owns that meeting
- **Task Authorization**: Only task owners can update their own tasks (move to in-progress, complete, etc.)
- **Admin Controls**: Admins can upload transcripts, manage users, reset passwords, and delete meetings

### 🚦 Action Triage Center
- **Confidence Filtering**: 
  - HIGH confidence actions automatically go to Kanban board
  - MEDIUM/LOW confidence items appear in a review list for human verification
- **Intent Quick-Filters**: Filter by Actions, Decisions, or Blockers
- **Draft Review**: Review and verify ambiguous AI extractions before they become tasks
- **Owner Links**: Click on owner names to view their profile (if they're registered users)

### ⚖️ Owner Workload Distribution
- **Visual Chart**: Dynamic pie chart showing workload distribution across owners
- **Interactive Filtering**: Click on owner slices to filter tasks
- **Team Name Support**: Handles both individual users and team names (e.g., "Mark's team", "Q&A")
- **Workload Insights**: Quickly identify workload imbalances

### 📋 Integrated Kanban Board
- **Auto-Population**: HIGH confidence actions automatically added to "To Do"
- **Drag-and-Drop**: Move tasks between columns (To Do, In Progress, Complete)
- **Authorization**: Only task owners can move their tasks between columns
- **Source Verification**: View the original transcript quote for each action
- **Status Tracking**: Visual workflow management

### 📅 Calendar View
- **Monthly Calendar**: Visual calendar showing all tasks with due dates and meetings
- **Event Display**: See tasks and meetings organized by date
- **Click to Navigate**: Click on calendar events to view meeting details
- **Status Indicators**: Color-coded tasks by status (To Do, In Progress, Complete)
- **Upcoming Events**: List view of upcoming tasks and meetings
- **Date Navigation**: Navigate between months to view past and future events

### 📊 Completion Metrics & Analytics
- **Overall Completion Rate**: Track percentage of completed tasks with visual progress bar
- **Status Distribution**: Visual breakdown of task statuses (pie chart)
- **Intent Analysis**: See distribution of Actions, Decisions, and Blockers (bar chart)
- **Confidence Levels**: Analyze tasks by confidence (HIGH, MEDIUM, LOW)
- **Owner Performance**: Completion rates by owner/team with detailed breakdown
- **Detailed Statistics**: Total tasks, meetings, and completion trends
- **Performance Tracking**: Monitor team and individual productivity metrics

### 📤 Shareability & Export
- **Shareable Links**: Generate read-only URLs for meeting summaries
- **Export Formats**: 
  - Decisions only (for executive summaries)
  - Owner-specific task lists
  - Full meeting reports
- **Email Results**: Send meeting summaries, decisions, or full reports to selected email addresses
- **Owner Notifications**: Generate task summaries ready for Slack/email

### 👥 User Management (Admin)
- **User List**: View all registered users
- **Role Management**: Change user roles/departments
- **Password Reset**: Reset any user's password
- **User Profiles**: View individual user profiles with their assigned tasks

### 📧 Email Functionality
- **Multiple Recipients**: Send to multiple email addresses at once
- **Email Types**: 
  - Summary Only (statistics)
  - Decisions Only (key decisions)
  - Actions Only (action items)
  - Full Report (everything)
- **HTML Emails**: Formatted HTML emails with meeting details
- **Plain Text Fallback**: Plain text version for email clients

## 🏗️ Architecture

### Backend
- **Framework**: Python Flask
- **AI Processing**: Google Gemini API (gemini-2.5-flash)
- **Audio Transcription**: OpenAI Whisper API (optional)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Storage**: JSON file-based (easily replaceable with Firebase/Supabase)
- **Email**: SMTP (configurable)

### Frontend
- **Framework**: React with Vite
- **Routing**: React Router DOM
- **Visualizations**: Recharts (Owner Wheel)
- **Drag & Drop**: @hello-pangea/dnd (Kanban board)
- **HTTP Client**: Axios
- **State Management**: React Context API

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **npm** or **yarn**
- **Google Gemini API Key** (already configured in code)
- **OpenAI API Key** (optional, for audio transcription)
- **SMTP Credentials** (optional, for email functionality)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-meeting-transcripts
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv .venv

# Activate virtual environment
# On Linux/Mac:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure API Keys

The Gemini API key is already configured in `backend.py`. If you need to change it, edit the `GEMINI_API_KEY` variable.

#### Optional: Audio Transcription Setup

To enable audio transcription, set the OpenAI API key:

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

Or add it to your environment variables. You can get an API key from [OpenAI](https://platform.openai.com/api-keys).

#### Optional: Email Setup

To enable email functionality, configure SMTP settings:

```bash
export SMTP_SERVER="smtp.gmail.com"  # or your SMTP server
export SMTP_PORT="587"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"  # Use app password for Gmail
export EMAIL_FROM="your-email@gmail.com"  # Optional, defaults to SMTP_USERNAME
```

**For Gmail users**: You'll need to generate an [App Password](https://support.google.com/accounts/answer/185833) instead of using your regular password.

#### Start Backend Server

```bash
python backend.py
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

#### Install Node Dependencies

```bash
npm install
```

#### Start Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Running Both Services

You can run both services simultaneously:

**Terminal 1 (Backend):**
```bash
cd ai-meeting-transcripts
source .venv/bin/activate  # if using virtual environment
python backend.py
```

**Terminal 2 (Frontend):**
```bash
cd ai-meeting-transcripts
npm run dev
```

## 📖 Usage Guide

### Initial Setup

1. **Create Admin Account**: 
   - Navigate to `/signup`
   - Enter your details and select "Admin" as your role
   - Or use the provided demo accounts (see below)

2. **Create User Accounts** (Optional):
   - Admins can create user accounts via the Admin Panel
   - Or use the `create_users.py` script to bulk create users from a transcript

### Uploading a Meeting Transcript

1. **Login** as an admin user
2. **Navigate** to the Upload page (`/upload`)
3. **Choose Input Method**:
   - **Text Mode**: Paste transcript or upload a text file
   - **Audio Mode**: Record audio or upload an audio file
4. **Enter Meeting Title** (optional)
5. **Process**: Click "Process Transcript" to analyze with AI

### Reviewing Results

1. **Action Triage Center**: Review draft actions (MEDIUM/LOW confidence)
2. **Owner Wheel**: Visualize workload distribution
3. **Kanban Board**: Manage high-confidence actions
4. **Filters**: Use intent filters (Actions, Decisions, Blockers)

### Managing Tasks

- **Move Tasks**: Drag and drop tasks between columns (only if you're the task owner)
- **View Details**: Click on actions to see source quotes and context
- **Filter by Owner**: Click on owner names in the Owner Wheel to filter

### Calendar & Metrics

- **View Calendar**: Navigate to Calendar page to see all tasks and meetings organized by date
- **Track Completion**: View Metrics page for completion rates and analytics
- **Monitor Performance**: See completion rates by owner, status distribution, and trends

### Sharing & Exporting

- **Share Link**: Generate a read-only shareable URL
- **Export Decisions**: Copy decisions for executive summaries
- **Email Results**: Send meeting summaries to stakeholders
- **Owner Summary**: Copy task list for a specific owner

### Admin Functions

- **User Management**: View and manage all users
- **Role Changes**: Update user roles/departments
- **Password Reset**: Reset any user's password
- **Delete Meetings**: Remove meetings (admin or meeting owner)

## 🔑 Demo Accounts

The following demo accounts are available (password: `password123`):

- **Tom (Admin)**: `tom@company.com`
- **Sarah (PM)**: `sarah@company.com`
- **Mark (Design)**: `mark@company.com`
- **John (Engineer)**: `john@company.com`

## 📡 API Endpoints

### Authentication (Public)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user info (requires auth)

### Meetings (Requires Authentication)
- `POST /api/process` - Process a transcript (admin only)
- `POST /api/transcribe` - Transcribe audio file to text (admin only, requires OpenAI API key)
- `GET /api/meetings` - List all meetings for current user
- `GET /api/meetings/:id` - Get specific meeting (only if owner)
- `DELETE /api/meetings/:id` - Delete meeting (admin or meeting owner)
- `POST /api/meetings/:id/email` - Send meeting results via email (admin or meeting owner, requires SMTP config)
- `PATCH /api/meetings/:id/actions/:action_id` - Update action status (only task owner or meeting owner)
- `GET /api/meetings/:id/export?format=decisions|owner` - Export meeting (only if owner)
- `POST /api/meetings/:id/share` - Create shareable link (only if owner)

### Admin Endpoints (Requires Admin Role)
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user role
- `POST /api/admin/users/:id/password` - Reset user password

### User Profile Endpoints (Requires Authentication)
- `GET /api/users/me/tasks` - Get current user's tasks
- `GET /api/users/:id/tasks` - Get specific user's tasks (self or admin only)
- `GET /api/users/by-name/:name` - Get user ID by name

### Calendar & Metrics Endpoints (Requires Authentication)
- `GET /api/calendar` - Get calendar data (tasks with due dates and meetings)
- `GET /api/metrics` - Get completion metrics and analytics

## 📊 Data Structure

### Action Item Structure
```json
{
  "id": "unique-id",
  "description": "Task description",
  "owner": "Owner name or UNASSIGNED",
  "intent": "ACTION | DECISION | BLOCKER",
  "confidence": "HIGH | MEDIUM | LOW",
  "due_date": "Optional due date",
  "context": "Optional context",
  "source_line": "Original quote from transcript"
}
```

### Meeting Structure
```json
{
  "id": "meeting-id",
  "title": "Meeting title",
  "transcript": "Full transcript text",
  "owner_id": "User ID of meeting owner",
  "owner_email": "Owner email",
  "owner_name": "Owner name",
  "processed_at": "ISO timestamp",
  "actions": [/* array of action items */],
  "summary": {
    "total_actions": 10,
    "total_decisions": 3,
    "total_blockers": 2,
    "unassigned_actions": 1
  }
}
```

## 🎯 Intent Definitions

- **ACTION**: A clearly assigned task with a specified owner
- **DECISION**: A formal agreement or choice that impacts future work
- **BLOCKER**: An explicitly mentioned risk or obstacle preventing progress

## 📈 Confidence Levels

- **HIGH**: Task and owner clearly stated (automatically added to Kanban)
- **MEDIUM**: Task clear, owner implied or general team (requires review)
- **LOW**: Ambiguous, conditional, or inferred (requires review)

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access Control**: Admin and user roles
- **Ownership Validation**: Users can only access their own meetings
- **Task Authorization**: Only task owners can update their tasks
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security
- **Input Validation**: Email validation, password requirements
- **CORS Protection**: Configured for frontend origin only

## 🛠️ Development

### Project Structure

```
ai-meeting-transcripts/
├── backend.py              # Flask backend server
├── action_tracker.py       # AI prompt and schema definitions
├── system_prompt.py        # System prompt for Gemini API
├── create_users.py         # Script to create users from transcript
├── requirements.txt        # Python dependencies
├── data/                   # JSON storage (gitignored)
│   ├── meetings.json
│   └── users.json
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.jsx
│   │   ├── MeetingView.jsx
│   │   ├── UploadTranscript.jsx
│   │   ├── ActionTriage.jsx
│   │   ├── OwnerWheel.jsx
│   │   ├── KanbanBoard.jsx
│   │   ├── AdminPanel.jsx
│   │   ├── UserProfile.jsx
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx # Authentication context
│   ├── utils/
│   │   └── api.js         # API client
│   └── styles/
│       └── index.css      # Global styles
└── package.json           # Node dependencies
```

### Environment Variables

```bash
# Required
GEMINI_API_KEY="your-gemini-api-key"  # Already in code

# Optional
OPENAI_API_KEY="your-openai-api-key"  # For audio transcription
SMTP_SERVER="smtp.gmail.com"          # For email
SMTP_PORT="587"
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="your-email@gmail.com"
JWT_SECRET="your-secret-key"          # For production
```

## 🐛 Troubleshooting

### Backend Issues

**ModuleNotFoundError**: Make sure you've activated the virtual environment and installed dependencies:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

**Port Already in Use**: Change the port in `backend.py` or kill the process using port 5000:
```bash
lsof -ti:5000 | xargs kill -9
```

**Email Not Sending**: Check SMTP credentials and ensure you're using an app password for Gmail.

### Frontend Issues

**Vite Cache Issues**: Clear the Vite cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

**Module Not Found**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Common Issues

**404 Errors for Team Names**: This is normal - team names like "Mark's team" aren't users, so they won't have profiles. The app handles this gracefully.

**Login Fails**: Check that the backend is running and check backend logs for detailed error messages.

**Audio Transcription Not Working**: Ensure OPENAI_API_KEY is set and the backend has been restarted.

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Use environment variables for all API keys and secrets
2. **Database**: Replace JSON file storage with a proper database (PostgreSQL, MongoDB, etc.)
3. **HTTPS**: Use HTTPS in production
4. **CORS**: Configure CORS to only allow your production domain
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Error Logging**: Set up proper error logging and monitoring
7. **Backup**: Implement regular backups of meeting and user data

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on the repository.
