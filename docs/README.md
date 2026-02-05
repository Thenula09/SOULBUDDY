# 📚 SoulBuddy Documentation

Welcome to the SoulBuddy documentation directory!

## 📖 Documentation Structure

This directory contains comprehensive documentation for the SoulBuddy project.

### Available Documentation

- **[API Documentation](./API.md)** - Backend API endpoints and usage
- **[Architecture Guide](./ARCHITECTURE.md)** - System architecture overview
- **[Database Schema](./DATABASE.md)** - Database structure and relationships
- **[Deployment Guide](./DEPLOYMENT.md)** - Deployment instructions

---

## 🔗 Quick Links

- [Main README](../README.md)
- [Repository Structure](../REPOSITORY_STRUCTURE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Mobile App README](../SOULBUDDYMobile/README.md)

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────┐
│         Mobile Application              │
│     (React Native - iOS/Android)        │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│         API Gateway                      │
│  (Authentication, Rate Limiting)         │
└──────────────┬──────────────────────────┘
               │
       ┌───────┼────────┬─────────┐
       ↓       ↓        ↓         ↓
┌──────────┐ ┌─────┐ ┌──────┐ ┌──────┐
│   User   │ │ Chat│ │ Mood │ │ ...  │
│ Service  │ │  AI │ │Analyt│ │      │
│          │ │     │ │ ics  │ │      │
└────┬─────┘ └──┬──┘ └───┬──┘ └──┬───┘
     │          │        │       │
     └──────────┴────────┴───────┘
                 ↓
      ┌──────────────────────┐
      │    PostgreSQL        │
      │    (Supabase)        │
      └──────────────────────┘
```

---

## 🚀 Services Overview

### 1. **User Service** (Port: 8004)
- User registration and authentication
- Profile management
- JWT token handling
- User preferences

### 2. **Chat AI Service** (Port: 8002)
- AI-powered conversations
- Emotion detection
- Context-aware responses
- OpenAI/Gemini integration

### 3. **Mood Analytics Service** (Port: 8003)
- Mood entry logging
- 5-minute interval tracking
- Pattern analysis
- Historical data visualization

### 4. **API Gateway** (Port: TBD)
- Request routing
- Authentication middleware
- Rate limiting
- Security layer

---

## 🔄 Data Flow

### User Authentication Flow
```
1. User enters credentials → Mobile App
2. Mobile App → API Gateway → User Service
3. User Service validates → PostgreSQL
4. JWT token generated ← User Service
5. Token returned → Mobile App
```

### Mood Logging Flow
```
1. User logs mood → Mobile App
2. Mobile App → API Gateway → Mood Analytics
3. Mood data saved → PostgreSQL
4. Analytics generated ← Mood Analytics
5. Results displayed → Mobile App
```

### AI Chat Flow
```
1. User sends message → Mobile App
2. Mobile App → API Gateway → Chat AI Service
3. Chat AI → OpenAI/Gemini API
4. AI response ← Chat AI Service
5. Response displayed → Mobile App
```

---

## 🛠️ Technology Stack

### Frontend (Mobile)
- **React Native** 0.83.1
- **TypeScript**
- **React Navigation** - Navigation
- **Zustand** - State management
- **Axios** - API calls
- **React Native SVG** - Graphics

### Backend (Services)
- **FastAPI** - Web framework
- **Python** 3.9+
- **PostgreSQL** - Database
- **Supabase** - Database hosting
- **JWT** - Authentication
- **OpenAI/Gemini** - AI integration

### DevOps
- **Git** - Version control
- **GitHub** - Repository hosting
- **Docker** - Containerization (planned)

---

## 📱 Mobile App Features

- ✅ User authentication (Login, Register, Forgot Password)
- ✅ Mood logging with timeline
- ✅ AI chat interface
- ✅ Profile management
- ✅ Mood analytics and charts
- ✅ Beautiful UI with animations
- 🔄 Push notifications (planned)
- 🔄 Dark mode (planned)

---

## 🔐 Security

- JWT-based authentication
- Password hashing (bcrypt)
- HTTPS for all communications
- Environment variables for secrets
- Rate limiting on API endpoints
- Input validation and sanitization

---

## 📊 Database

- **Provider**: Supabase (PostgreSQL)
- **Tables**: Users, Moods, Chat Sessions, etc.
- See [DATABASE.md](./DATABASE.md) for detailed schema

---

## 🧪 Testing

### Mobile App
```bash
cd SOULBUDDYMobile
npm test
```

### Backend Services
```bash
cd backend-services/[service-name]
pytest
```

---

## 📈 Future Enhancements

- [ ] Real-time chat with WebSocket
- [ ] Social features (share moods with friends)
- [ ] Mood prediction using ML
- [ ] Integration with wearables
- [ ] Multi-language support
- [ ] Therapist consultation booking
- [ ] Emergency support hotline integration

---

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Check existing documentation
- Contact the development team

---

**Last Updated**: February 2026

**Maintained by**: SoulBuddy Team
