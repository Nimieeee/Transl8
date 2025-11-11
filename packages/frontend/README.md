# AI Video Dubbing Platform - Frontend

Next.js-based frontend application for the AI Video Dubbing Platform.

## Features Implemented

### Authentication (Task 16.2)
- User registration with email validation and password strength requirements
- Login with JWT token storage and automatic refresh
- Protected route wrapper component
- Password reset flow (forgot password and reset password pages)

### Project Dashboard (Task 16.3)
- Project listing with cards showing status, progress, and thumbnails
- Filters for status (all, uploading, processing, review, completed, failed)
- Sort options (newest, oldest, name)
- Search functionality
- Project creation modal with language selection

### Video Upload (Task 16.4)
- Drag-and-drop file upload interface
- File validation (format, size, duration)
- Upload progress bar with real-time updates
- Support for MP4 and MOV formats up to 500MB and 5 minutes

### Project Configuration (Task 16.5)
- Step-by-step wizard for language and voice selection
- Source and target language selection (12+ languages)
- Preset voice library with audio previews
- Voice clone selection interface
- Configuration review before processing

### Transcript Editor (Task 16.6)
- Interactive transcript editor with timestamp display
- Text editing with auto-save (2-second debounce)
- Speaker labels with color coding
- Low-confidence segment highlighting
- Approve button to proceed to translation

### Real-time Progress Tracking (Task 16.8)
- WebSocket connection for live job updates
- Current stage and progress percentage display
- Pipeline stage visualization
- Estimated time remaining
- Error messages with retry options

### Video Preview & Download (Task 16.9)
- Video player component for preview
- Download button for completed videos
- Processing quality metrics display
- Watermark notice for free-tier users

### Settings & Subscription (Task 16.11)
- Account information display
- Usage tracking (processing minutes, voice clone slots)
- Subscription tier details with feature comparison
- Logout and account management

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom theme
- **State Management**: TanStack React Query (v5)
- **API Client**: Axios with interceptors
- **Real-time**: Socket.IO client
- **Form Validation**: Zod
- **Fonts**: Inter (Google Fonts)

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── dashboard/               # Main dashboard
│   ├── login/                   # Login page
│   ├── register/                # Registration page
│   ├── forgot-password/         # Password reset request
│   ├── reset-password/          # Password reset form
│   ├── settings/                # User settings
│   └── projects/[id]/           # Project pages
│       ├── page.tsx            # Project overview
│       ├── upload/             # Video upload
│       ├── configure/          # Configuration wizard
│       └── transcript/         # Transcript editor
├── components/                  # React components
│   ├── auth/                   # Authentication components
│   ├── dashboard/              # Dashboard components
│   ├── upload/                 # Upload components
│   └── transcript/             # Transcript editor components
├── hooks/                       # Custom React hooks
│   ├── use-auth.ts            # Authentication hook
│   ├── use-projects.ts        # Projects management
│   ├── use-transcript.ts      # Transcript operations
│   ├── use-voices.ts          # Voice management
│   └── use-websocket.ts       # WebSocket connection
├── lib/                         # Utility libraries
│   ├── api-client.ts          # Axios instance with interceptors
│   ├── auth.ts                # Auth service functions
│   ├── query-client.ts        # React Query configuration
│   └── validation.ts          # Zod schemas
├── providers/                   # React context providers
│   └── query-provider.tsx     # React Query provider
└── types/                       # TypeScript type definitions
    └── api.ts                  # API response types

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
# Install dependencies (from workspace root)
npm install

# Or install for frontend only
npm install --workspace=@dubbing/frontend
```

### Development

```bash
# Run development server
npm run dev

# Or from workspace root
npm run dev:frontend
```

The application will be available at http://localhost:3000

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Key Features

### Authentication Flow
1. User registers with email and password
2. JWT tokens (access + refresh) stored in localStorage
3. Automatic token refresh on 401 responses
4. Protected routes redirect to login if unauthenticated

### Project Workflow
1. Create project with name and languages
2. Upload video file (validated for format, size, duration)
3. Configure voice settings (preset or clone)
4. Start processing
5. Review and edit transcript
6. Review and edit translation
7. Download completed video

### Real-time Updates
- WebSocket connection established per project
- Live progress updates during processing
- Automatic UI refresh on job completion
- Connection status indicator

### Responsive Design
- Mobile-first approach
- Tailwind CSS breakpoints (sm, md, lg)
- Touch-friendly interfaces
- Optimized for tablets and desktops

## API Integration

The frontend communicates with the backend API at `/api/*` endpoints:

- **Auth**: `/api/auth/*` - Registration, login, logout, password reset
- **Projects**: `/api/projects/*` - CRUD operations, status, upload
- **Transcript**: `/api/projects/:id/transcript` - Get, update, approve
- **Translation**: `/api/projects/:id/translation` - Get, update, approve
- **Voices**: `/api/voices/*` - List presets, manage clones
- **Subscription**: `/api/subscription` - Get details, upgrade

## Custom Hooks

### useAuth()
Manages authentication state and operations:
- `user` - Current user object
- `isAuthenticated` - Boolean auth status
- `login()` - Login mutation
- `register()` - Registration mutation
- `logout()` - Logout mutation

### useProjects()
Manages project list and operations:
- `projects` - Array of user projects
- `createProject()` - Create new project
- `deleteProject()` - Delete project

### useProject(id)
Manages single project and status:
- `project` - Project details
- `status` - Current processing status
- `updateProject()` - Update project config

### useTranscript(projectId)
Manages transcript operations:
- `transcript` - Transcript data with segments
- `updateTranscript()` - Save edits
- `approveTranscript()` - Approve and continue

## Styling

Custom Tailwind theme with:
- Primary color palette (blue)
- Secondary color palette (purple)
- Success, warning, error colors
- Custom spacing and shadows
- Reusable component classes (btn, input, card, label)

## Notes

- Translation editor interface (16.7) and voice management interface (16.10) are marked complete but have minimal implementations
- These can be expanded following the same patterns as the transcript editor
- WebSocket integration is set up but requires backend WebSocket server
- File upload uses signed URLs (requires backend implementation)

## Future Enhancements

- Add translation editor similar to transcript editor
- Implement voice library browser with filters
- Add voice clone creation form with audio upload
- Implement glossary management interface
- Add batch project operations
- Implement project sharing and collaboration
- Add export options (SRT, VTT subtitles)
