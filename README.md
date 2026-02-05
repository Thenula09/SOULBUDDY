# 🌟 SoulBuddy - AI-Powered Mental Health & Mood Tracking Platform

SoulBuddy is a comprehensive mental health and mood tracking application that combines AI-powered chat assistance with detailed mood analytics to help users better understand and improve their mental well-being.

## 📦 Project Structure

This monorepo contains both the mobile application and backend microservices:

### 🔗 Quick Links to Services
- **[📱 Mobile Application](./SOULBUDDYMobile)** - React Native app (iOS & Android)
- **[🔧 Backend Services](./backend-services)** - Python FastAPI microservices
  - **[👤 User Service](./backend-services/user-service)** - Authentication & user management (Port: 8004)
  - **[💬 Chat AI Service](./backend-services/chat-ai-service)** - AI chat & emotion detection (Port: 8002)
  - **[📊 Mood Analytics](./backend-services/mood-analytics)** - Mood tracking & analytics (Port: 8003)
  - **[🚪 API Gateway](./backend-services/api-gateway)** - API routing & security
- **[📖 Documentation](./docs)** - Project documentation
- **[📋 Repository Structure](./REPOSITORY_STRUCTURE.md)** - Detailed structure guide

```
SOULBUDDY/
├── SOULBUDDYMobile/          # React Native mobile app (iOS & Android)
├── backend-services/          # Backend microservices (FastAPI + PostgreSQL)
│   ├── user-service/         # User authentication & profiles (Port: 8004)
│   ├── chat-ai-service/      # AI chat & emotion detection (Port: 8002)
│   ├── mood-analytics/       # Mood tracking & analytics (Port: 8003)
│   └── api-gateway/          # API routing & security
├── docs/                      # Documentation
├── README.md                  # This file
├── CONTRIBUTING.md            # Contribution guidelines
└── REPOSITORY_STRUCTURE.md    # Detailed structure
```

## ✨ Key Features

### Mobile App
- 🔐 User authentication (Login, Register, Password Recovery)
- 😊 Mood tracking with 5-minute intervals
- 💬 AI-powered chat for emotional support
- 📈 Mood analytics and visualizations
- 👤 User profile management
- 🎨 Beautiful UI with SVG animations

### Backend Services
- 🔒 Secure authentication with JWT
- 🤖 AI integration (OpenAI/Gemini)
- 📊 Advanced mood analytics
- 🗄️ PostgreSQL database (Supabase)
- 🔄 Microservices architecture

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for mobile app)
- Python 3.9+ (for backend services)
- PostgreSQL (Supabase account)
- React Native development environment
- iOS: Xcode & CocoaPods
- Android: Android Studio

### 📱 Mobile Application Setup

See the [Mobile App README](./SOULBUDDYMobile/README.md) for detailed setup instructions.

Quick start:
```bash
cd SOULBUDDYMobile
npm install
npm start
npm run android  # or npm run ios
```

### 🔧 Backend Services Setup

Each service has its own setup. See individual service READMEs:
- [User Service Setup](./backend-services/user-service/README.md)
- [Chat AI Service Setup](./backend-services/chat-ai-service/README.md)
- [Mood Analytics Setup](./backend-services/mood-analytics/README.md)
- [API Gateway Setup](./backend-services/api-gateway/README.md)

Quick start (example for user-service):
```bash
cd backend-services/user-service
pip install -r requirements.txt
python main.py
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
    ┌────┼────┬────────┐
    ↓    ↓    ↓        ↓
┌────┐ ┌───┐ ┌────┐ ┌────┐
│User│ │Chat│ │Mood│ │...│
│Svc │ │Svc│ │Svc │ │   │
└────┘ └───┘ └────┘ └────┘
    │    │     │       │
    └────┴─────┴───────┘
            ↓
    ┌──────────────┐
    │  PostgreSQL  │
    │  (Supabase)  │
    └──────────────┘
```

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 📞 Support

For questions or issues, please create an issue in this repository.

---

## 🔗 Additional Resources

- [Repository Structure Guide](./REPOSITORY_STRUCTURE.md)
- [Documentation](./docs)

---

**Made with ❤️ by the SoulBuddy Team**
