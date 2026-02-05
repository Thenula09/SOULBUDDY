# 📚 SoulBuddy Monorepo Guide
Complete guide to the SoulBuddy mental health platform's architecture and repository organization.

## 🎯 Overview
SoulBuddy is an AI-powered mental health and mood tracking platform split into multiple components for better scalability, maintainability, and deployment flexibility. The system combines AI-powered chat assistance with detailed mood analytics to help users better understand and improve their mental well-being.

## 📁 Repository Structure
The SoulBuddy project is organized as a **monorepo** containing all services and applications in one place:

```
SOULBUDDY/
├── SOULBUDDYMobile/                     # Mobile Application
│   ├── src/                             # Source code
│   │   ├── screens/                     # App screens
│   │   ├── components/                  # Reusable components
│   │   ├── navigation/                  # Navigation setup
│   │   ├── services/                    # API services
│   │   └── store/                       # State management
│   ├── android/                         # Android native code
│   ├── ios/                             # iOS native code
│   └── package.json
│
├── backend-services/                    # Backend Microservices
│   ├── user-service/                    # Python FastAPI - User management
│   ├── chat-ai-service/                 # Python FastAPI - AI chat
│   ├── mood-analytics/                  # Python FastAPI - Mood analytics
│   └── api-gateway/                     # API Gateway & routing
│
├── docs/                                # Documentation
│   └── README.md
├── README.md                            # This file
├── CONTRIBUTING.md                      # Contribution guidelines
├── REPOSITORY_STRUCTURE.md              # Detailed structure
└── LICENSE                              # MIT License
```

---

## 📱 Mobile Application (1 Repository)

### SoulBuddy Mobile App
**Cross-Platform Mental Health Mobile Application**

- **Technology**: React Native 0.83.1, TypeScript
- **Platform**: iOS & Android
- **Purpose**: User-facing mental health and mood tracking interface
- **Location**: `/SOULBUDDYMobile/`

**Key Features**:
- User registration and JWT authentication
- Mood logging with 5-minute interval tracking
- AI chat for emotional support
- Timeline visualization of mood patterns
- User profile management
- Beautiful SVG backgrounds and animations
- Offline support with local storage
- Push notifications (planned)

**Key Dependencies**:
- React Native 0.83.1
- React Navigation 6.x - Screen navigation
- React Native SVG - Graphics and animations
- Axios - API communication
- Zustand - State management
- AsyncStorage - Local data persistence

**Setup**:
```bash
cd SOULBUDDYMobile
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

**Repository**: Located in `/SOULBUDDYMobile/`

---

## 🔧 Backend Services (4 Microservices)

### 1. User Service
**User Management & Authentication Microservice**

- **Technology**: Python 3.9+, FastAPI
- **Database**: PostgreSQL (Supabase)
- **Purpose**: User registration, authentication, and profile management
- **Port**: 8004

**Key Features**:
- User registration with email validation
- JWT-based authentication
- Password hashing with bcrypt
- Profile management (update, delete)
- User preferences and settings
- Password reset functionality
- Account verification

**API Endpoints**:
```
POST   /api/auth/register       # Register new user
POST   /api/auth/login          # User login
GET    /api/users/{user_id}     # Get user profile
PUT    /api/users/{user_id}     # Update profile
DELETE /api/users/{user_id}     # Delete account
POST   /api/auth/forgot-password # Password reset
```

**Setup**:
```bash
cd backend-services/user-service
pip install -r requirements.txt
python main.py
```

**Repository**: Located in `/backend-services/user-service/`

---

### 2. Chat AI Service
**AI-Powered Conversation Microservice**

- **Technology**: Python 3.9+, FastAPI
- **Database**: PostgreSQL (Supabase)
- **AI Integration**: OpenAI GPT-4 / Google Gemini
- **Purpose**: AI-powered emotional support chat
- **Port**: 8002

**Key Features**:
- Real-time AI chat conversations
- Emotion detection from user messages
- Context-aware responses
- Chat history persistence
- Session management
- Sentiment analysis
- Crisis detection and alert
- Integration with OpenAI/Gemini APIs

**API Endpoints**:
```
POST   /api/chat/message        # Send chat message
GET    /api/chat/history/{user_id} # Get chat history
GET    /api/chat/session/{session_id} # Get session
DELETE /api/chat/session/{session_id} # Clear session
POST   /api/chat/analyze        # Analyze emotion
```

**Setup**:
```bash
cd backend-services/chat-ai-service
pip install -r requirements.txt
# Set environment variables
export OPENAI_API_KEY="your-key"
export GEMINI_API_KEY="your-key"
python main.py
```

**Repository**: Located in `/backend-services/chat-ai-service/`

---

### 3. Mood Analytics Service
**Mood Tracking & Analytics Microservice**

- **Technology**: Python 3.9+, FastAPI
- **Database**: PostgreSQL (Supabase)
- **Purpose**: Mood entry logging, retrieval, and pattern analysis
- **Port**: 8003

**Key Features**:
- Mood entry logging with 5-minute intervals
- Mood pattern analysis
- Historical data visualization
- Lifestyle correlation analytics (sleep, exercise, diet)
- Mood trends and insights
- Weekly/monthly reports
- Custom mood categories
- Data export functionality

**API Endpoints**:
```
POST   /api/mood/log            # Log mood entry
GET    /api/mood/{user_id}      # Get mood history
GET    /api/mood/analytics/{user_id} # Get analytics
GET    /api/mood/trends/{user_id}    # Get trends
GET    /api/mood/report/{user_id}    # Generate report
DELETE /api/mood/{entry_id}     # Delete mood entry
```

**Setup**:
```bash
cd backend-services/mood-analytics
pip install -r requirements.txt
python main.py
```

**Repository**: Located in `/backend-services/mood-analytics/`

---

### 4. API Gateway
**Central API Gateway & Routing**

- **Technology**: Python 3.9+, FastAPI / Nginx (planned)
- **Purpose**: Request routing, authentication middleware, rate limiting
- **Port**: TBD

**Key Features**:
- Routes requests to appropriate microservices
- JWT authentication middleware
- Rate limiting and throttling
- Request/response logging
- CORS configuration
- Load balancing (planned)
- API versioning
- Health check endpoints

**Setup**:
```bash
cd backend-services/api-gateway
pip install -r requirements.txt
python main.py
```

**Repository**: Located in `/backend-services/api-gateway/`

---

## � System Integration Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    SoulBuddy System Architecture                  │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  SoulBuddy      │
│  Mobile App     │
│  (React Native) │
│  iOS & Android  │
└────────┬────────┘
         │
         │ HTTPS
         ↓
┌─────────────────┐
│   API Gateway   │
│   (FastAPI)     │
│  - Auth Check   │
│  - Rate Limit   │
│  - Routing      │
└────────┬────────┘
         │
         └─────────────┬──────────────┬─────────────┐
                       │              │             │
                       ↓              ↓             ↓
              ┌────────────┐  ┌──────────┐  ┌─────────────┐
              │   User      │  │  Chat AI │  │    Mood     │
              │  Service    │  │  Service │  │  Analytics  │
              │  (FastAPI)  │  │ (FastAPI)│  │  (FastAPI)  │
              │   :8004     │  │  :8002   │  │   :8003     │
              └─────┬───────┘  └────┬─────┘  └──────┬──────┘
                    │               │                │
                    │               │                │
                    └───────┬───────┴────────────────┘
                            │
                            ↓
                 ┌──────────────────────┐
                 │    PostgreSQL        │
                 │    (Supabase)        │
                 │  - Users             │
                 │  - Moods             │
                 │  - Chat Sessions     │
                 └──────────┬───────────┘
                            │
                            ↓
                 ┌──────────────────────┐
                 │   External APIs      │
                 │  - OpenAI GPT-4      │
                 │  - Google Gemini     │
                 │  - AWS S3 (Storage)  │
                 └──────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ (for mobile app)
- **Python** 3.9+ (for backend services)
- **PostgreSQL** (Supabase account recommended)
- **React Native** development environment
  - iOS: Xcode 14+, CocoaPods
  - Android: Android Studio, JDK 11+
- **Git** for version control

### Option 1: Full Stack Setup (Development)

#### Step 1: Clone Repository
```bash
git clone https://github.com/Thenula09/SOULBUDDY.git
cd SOULBUDDY
```

#### Step 2: Setup Backend Services
```bash
# User Service
cd backend-services/user-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Configure .env file
python main.py

# Chat AI Service (in new terminal)
cd backend-services/chat-ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Configure .env file
python main.py

# Mood Analytics Service (in new terminal)
cd backend-services/mood-analytics
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Configure .env file
python main.py
```

#### Step 3: Setup Mobile App
```bash
cd SOULBUDDYMobile
npm install

# For iOS
cd ios
pod install
cd ..
npm run ios

# For Android
npm run android
```

### Option 2: Mobile App Only
If you only want to run the mobile app (using production backend):

```bash
cd SOULBUDDYMobile
npm install

# Configure API endpoints in src/config/api.ts
npm start
npm run ios  # or npm run android
```

### Option 3: Backend Services Only
If you only want to run the backend:

```bash
# Install all services
cd backend-services

# Start each service in separate terminal
cd user-service && python main.py
cd chat-ai-service && python main.py
cd mood-analytics && python main.py
cd api-gateway && python main.py
```

---

## 🔧 Configuration

### Environment Variables

#### Backend Services (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key

# Server
HOST=0.0.0.0
PORT=8004  # Change per service
ENVIRONMENT=development
```

#### Mobile App (src/config/api.ts)
```typescript
export const API_BASE_URL = 'http://localhost:8004';
export const CHAT_API_URL = 'http://localhost:8002';
export const MOOD_API_URL = 'http://localhost:8003';
```

---

## 📊 Technology Stack

### Mobile Application
| Technology | Purpose |
|------------|---------|
| React Native 0.83.1 | Cross-platform framework |
| TypeScript | Type-safe development |
| React Navigation 6.x | App navigation |
| Zustand | State management |
| Axios | HTTP client |
| React Native SVG | Graphics & animations |
| AsyncStorage | Local data storage |

### Backend Services
| Technology | Purpose |
|------------|---------|
| Python 3.9+ | Programming language |
| FastAPI | Web framework |
| PostgreSQL | Relational database |
| Supabase | Database hosting |
| JWT | Authentication |
| Bcrypt | Password hashing |
| OpenAI API | AI chat |
| Google Gemini | AI chat alternative |
| Uvicorn | ASGI server |

---

## 📝 API Documentation

Once services are running, access Swagger documentation:

- **User Service**: http://localhost:8004/docs
- **Chat AI Service**: http://localhost:8002/docs
- **Mood Analytics**: http://localhost:8003/docs
- **API Gateway**: http://localhost:PORT/docs

---

## 🧪 Testing

### Mobile App
```bash
cd SOULBUDDYMobile
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Backend Services
```bash
cd backend-services/[service-name]
pytest                   # Run all tests
pytest --cov             # With coverage
pytest -v                # Verbose mode
```

```bash
cd backend-services/[service-name]
pytest                   # Run all tests
pytest --cov             # With coverage
pytest -v                # Verbose mode
```

---

## 🚢 Deployment

### Mobile App Deployment

#### iOS (App Store)
```bash
cd SOULBUDDYMobile/ios
# Update version in Info.plist
# Build archive in Xcode
# Upload to App Store Connect
```

#### Android (Google Play)
```bash
cd SOULBUDDYMobile/android
./gradlew bundleRelease
# Upload AAB to Google Play Console
```

### Backend Services Deployment

#### Docker Deployment (Recommended)
```bash
# Each service has a Dockerfile
cd backend-services/user-service
docker build -t soulbuddy-user-service .
docker run -p 8004:8004 soulbuddy-user-service
```

#### Cloud Deployment Options
- **AWS**: EC2, ECS, or Lambda
- **Google Cloud**: Cloud Run, GKE
- **Azure**: App Service, AKS
- **Heroku**: Easy deployment for Python services
- **DigitalOcean**: App Platform or Droplets

---

## 📚 Documentation

### Available Documentation
- **[Main README](./README.md)** - This file
- **[Repository Structure](./REPOSITORY_STRUCTURE.md)** - Detailed project structure
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[API Documentation](./docs/README.md)** - API endpoints and usage
- **[Mobile App Guide](./SOULBUDDYMobile/README.md)** - Mobile app setup

### Service-Specific Documentation
- [User Service README](./backend-services/user-service/README.md)
- [Chat AI Service README](./backend-services/chat-ai-service/README.md)
- [Mood Analytics README](./backend-services/mood-analytics/README.md)
- [API Gateway README](./backend-services/api-gateway/README.md)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Known Issues & Limitations

- API Gateway is currently in development (TBD port)
- Push notifications not yet implemented
- Dark mode planned for future release
- Offline mode has limited functionality

---

## 🗺️ Roadmap

### Phase 1: Core Features (Current)
- ✅ User authentication
- ✅ Mood tracking
- ✅ AI chat
- ✅ Basic analytics

### Phase 2: Enhanced Features (Q2 2026)
- ⏳ Push notifications
- ⏳ Dark mode
- ⏳ Advanced analytics
- ⏳ Social features

### Phase 3: Advanced Features (Q3 2026)
- 🔄 Real-time chat with WebSocket
- 🔄 Integration with wearables
- 🔄 ML-based mood prediction
- 🔄 Multi-language support

### Phase 4: Professional Features (Q4 2026)
- 🔄 Therapist consultation booking
- 🔄 Emergency support hotline
- 🔄 Insurance integration
- 🔄 HIPAA compliance

---

## 📞 Support & Community

### Get Help
- 📧 **Email**: support@soulbuddy.app (example)
- 💬 **Discord**: Join our community (link TBD)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Thenula09/SOULBUDDY/issues)
- 💡 **Discussions**: [GitHub Discussions](https://github.com/Thenula09/SOULBUDDY/discussions)

### Report Issues
When reporting bugs, please include:
- Device and OS version
- App version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 👥 Team

**Maintained by**: SoulBuddy Development Team

### Contributors
See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for the full list of contributors.

---

## 🙏 Acknowledgments

- **React Native** team for the amazing framework
- **FastAPI** for the high-performance backend framework
- **OpenAI** and **Google** for AI APIs
- **Supabase** for database hosting
- All our **contributors** and **users**

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/Thenula09/SOULBUDDY?style=social)
![GitHub forks](https://img.shields.io/github/forks/Thenula09/SOULBUDDY?style=social)
![GitHub issues](https://img.shields.io/github/issues/Thenula09/SOULBUDDY)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Thenula09/SOULBUDDY)
![License](https://img.shields.io/github/license/Thenula09/SOULBUDDY)

---

## 🔗 Related Projects

- [Mental Health API](https://github.com/example/mental-health-api)
- [Mood Tracker SDK](https://github.com/example/mood-tracker-sdk)

---

**Made with ❤️ by the SoulBuddy Team**

*Last Updated: February 2026*
