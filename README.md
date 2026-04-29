# Catching – Location-Based Social Network

A **real-time social networking platform** that connects users based on their geographic location, enabling authentic interactions, location-based discovery, and meaningful connections with people nearby.

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

---

## ✨ Key Features

- **User Authentication & Profile Management**
  - Secure signup and login with JWT token-based authentication
  - Profile customization with pictures, age, gender, and status
  - Password encryption using bcrypt

- **Location-Based Discovery**
  - Real-time geospatial queries to find users nearby
  - Interactive map view powered by Leaflet
  - Location permissions and tracking

- **Social Interactions**
  - Create and share posts with images
  - Like/unlike posts from other users
  - Browse posts from nearby users
  - Real-time engagement notifications

- **Networking & Matchmaking**
  - Send and accept/reject friend requests
  - Match with compatible users
  - View matched user profiles

- **Real-Time Chat System**
  - Instant messaging with WebSocket support via Socket.io
  - Chat history and active conversations
  - Real-time message delivery

- **Online Presence Tracking**
  - See who's currently online
  - Real-time presence updates
  - Last-seen timestamps

- **Responsive Frontend**
  - Modern React 19 UI
  - TypeScript for type safety
  - Mobile-friendly design
  - Smooth navigation with React Router

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|---------------|
| **Frontend** | React 19, TypeScript, Vite, React Router, Leaflet, Socket.io Client |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB with Mongoose ODM |
| **Caching & Presence** | Redis |
| **Authentication** | JWT (JSON Web Tokens), bcrypt |
| **Package Manager** | npm |
| **Testing** | Jest |
| **Build Tool** | Vite |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** v16.0.0 or higher
- **npm** v7.0.0 or higher
- **MongoDB** (local or Atlas cloud database)
- **Redis** (local or cloud instance)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/catching-new.git
   cd catching-new
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   npm install --prefix Frontend
   ```

4. **Build the frontend** (optional, for production)
   ```bash
   npm run build
   ```

### Environment Variables

Create a `.env` file in the **root directory** of your project with the following variables:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<app-name>
DB_USER=your_mongodb_user
DB_PASSWORD=your_mongodb_password

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_TOKEN_SECRET=your_refresh_token_secret
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# Redis Cache & Presence
REDIS_URL=redis://:<password>@<host>:<port>
REDIS_TLS=false
```

**Note:** Replace placeholder values with your actual credentials:
- MongoDB URI from MongoDB Atlas or your local MongoDB instance
- Redis connection string from your Redis provider
- JWT secrets with strong, unique keys
- CLIENT_URL with your frontend deployment URL in production

### Running the Application

**Development Mode:**
```bash
npm run dev
```

This will:
- Start the backend server on `http://localhost:8000` (or your specified PORT)
- Frontend development server runs on `http://localhost:5173`
- Both support hot-reload for active development

**Production Mode:**
```bash
npm run build
npm start
```

The server will:
- Build the frontend and serve it from the backend
- Serve both frontend and API from a single server instance

**Testing:**
```bash
npm test
```

---

## 💡 Usage

### Authentication

**Sign Up:**
```bash
POST /api/users/signup
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password_123",
  "email": "john@example.com",
  "age": 25,
  "gender": "Male"
}
```

**Login:**
```bash
POST /api/users/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password_123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Core Features

**Get Nearby Users** (on the map):
```bash
GET /api/location/nearby
Authorization: Bearer <accessToken>
```

**Create a Post:**
```bash
POST /api/posts
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

{
  "image": <image-file>,
  "caption": "Beautiful sunset at the park!"
}
```

**Send a Friend Request:**
```bash
POST /api/requests
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "recipientId": "<userId>"
}
```

**Send a Real-Time Message** (via Socket.io):
```javascript
socket.emit('send_message', {
  recipientId: '<userId>',
  message: 'Hey, how are you?'
});
```

### Frontend Navigation

- **`/`** – Location permission request (gateway page)
- **`/auth`** – Authentication page (login/signup toggle)
- **`/home`** – Main feed with posts and user recommendations
- **`/map`** – Interactive map showing nearby users
- **`/profile/:userId`** – User profile view
- **`/chat`** – Real-time chat interface
- **`/requests`** – Friend requests and matches

---

## 📁 Project Structure

```
catching-new/
├── Backend/                          # Express.js server
│   ├── Controllers/                  # Business logic for routes
│   │   ├── userCont.js              # User management
│   │   ├── postCont.js              # Post creation & retrieval
│   │   ├── likeCont.js              # Like/engagement logic
│   │   ├── chatCont.js              # Chat history management
│   │   ├── locationCont.js          # Geospatial queries
│   │   ├── presenceCont.js          # Online status management
│   │   └── requestCont.js           # Friend requests & matches
│   ├── Models/                       # MongoDB Mongoose schemas
│   │   ├── user.js                  # User schema
│   │   ├── post.js                  # Post schema
│   │   ├── like.js                  # Like schema
│   │   └── location.js              # Location schema
│   ├── Routes/                       # API route definitions
│   │   ├── userRoute.js             # /api/users/*
│   │   ├── postRoute.js             # /api/posts/*
│   │   ├── chatRoute.js             # /api/chat/*
│   │   ├── locationRouter.js        # /api/location/*
│   │   └── ...others
│   ├── middleware/                   # Express middleware
│   │   ├── auth.js                  # JWT authentication
│   │   ├── socketAuth.js            # Socket.io authentication
│   │   └── upload.js                # File upload handling
│   ├── Database/                     # Database connection
│   │   └── db.js                    # MongoDB connection & config
│   ├── Redis/                        # Redis caching & presence
│   │   ├── client.js                # Redis client setup
│   │   ├── geo.js                   # Geospatial Redis operations
│   │   └── presence.js              # User presence tracking
│   ├── sockets/                      # Real-time Socket.io handlers
│   │   ├── chatSocket.js            # Chat socket logic
│   │   ├── locationSocket.js        # Location socket logic
│   │   └── onlineUsers.js           # Online users tracking
│   ├── tests/                        # Backend tests
│   ├── app.js                        # Express app configuration
│   └── server.js                     # Server startup & Socket.io setup
├── Frontend/                         # React.js web application
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   │   ├── Button.tsx           # Button component
│   │   │   ├── ChatWindow.tsx       # Chat UI
│   │   │   ├── MapView.tsx          # Map component
│   │   │   └── ...others
│   │   ├── pages/                   # Full-page components (routes)
│   │   │   ├── HomePage.tsx         # Main feed
│   │   │   ├── MapPage.tsx          # Map view
│   │   │   ├── ChatPage.tsx         # Chat interface
│   │   │   ├── LoginPage.tsx        # Login form
│   │   │   ├── ProfilePage.tsx      # User profile
│   │   │   └── ...others
│   │   ├── contexts/                # React Context for state
│   │   │   ├── AuthContext.tsx      # Authentication state
│   │   │   ├── SocketContext.tsx    # Socket.io connection
│   │   │   └── LocationContext.tsx  # Location state
│   │   ├── api/                     # API client functions
│   │   │   ├── authApi.js          # Auth API calls
│   │   │   ├── chatApi.js          # Chat API calls
│   │   │   └── ...others
│   │   ├── utils/                   # Utility functions
│   │   │   ├── api.ts              # Axios configuration
│   │   │   └── validation.ts       # Input validation
│   │   ├── App.tsx                  # Main app component & router
│   │   └── main.tsx                 # React entry point
│   ├── vite.config.ts               # Vite configuration
│   ├── package.json                 # Frontend dependencies
│   └── index.html                   # HTML template
├── picUploads/                       # User-uploaded images
│   └── post/                        # Post images directory
├── jest.config.js                   # Jest testing configuration
├── package.json                     # Root package configuration
├── server.js                        # Root entry point
├── .env                             # Environment variables
└── .gitignore                       # Git ignore rules
```

---

## 🤝 Contributing

I welcome contributions from the community! Here's how you can help:

### Steps to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/catching-new.git
   cd catching-new
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit your changes**
   ```bash
   git commit -m "Add your descriptive commit message"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**
   - Provide a clear description of your changes
   - Reference any related issues
   - Ensure tests pass before submitting

### Reporting Issues

Found a bug? Have a suggestion? Please open an issue on GitHub with:
- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Screenshots or logs if applicable

### Code Guidelines

- Follow the existing code style and structure
- Write meaningful commit messages
- Keep PRs focused on a single feature or fix
- Add comments for complex logic
- Test your changes before submitting

---

## 📝 Additional Notes

- **Session Persistence:** JWTs are used for stateless authentication. Refresh tokens are stored securely.
- **Real-Time Features:** Socket.io enables live updates for chat, presence, and location-based features.
- **Scalability:** Redis is used for caching and presence management to improve performance.
- **Security:** Passwords are hashed with bcrypt, and sensitive data is never exposed in responses.

---

 - **Contact Details:** mail: aayushlahoti0@gmail.com
