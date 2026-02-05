# 🌟 SoulBuddy - AI-Powered Mental Health & Mood Tracking Platform

SoulBuddy is a comprehensive mental health and mood tracking application that combines AI-powered chat assistance with detailed mood analytics to help users better understand and improve their mental well-being.

## 📦 Project Structure

This repository contains both the mobile application and backend services organized as sub-folders:

```
SOULBUDDY/
├── SOULBUDDYMobile/          # React Native mobile app (iOS & Android)
├── backend-services/          # Backend microservices
│   ├── user-service/         # User authentication & profiles
│   ├── chat-ai-service/      # AI chat & emotion detection
│   ├── mood-analytics/       # Mood tracking & analytics
│   └── api-gateway/          # API routing & security
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## 🚀 Features

### 🤖 AI Chat Service
- Intelligent conversation with emotion detection
- Personalized mental health support
- Real-time mood analysis during conversations

### 📊 Mood Analytics
- Comprehensive mood tracking and visualization
- Lifestyle factor correlation analysis
- Historical mood patterns and insights
- 5-minute interval tracking for detailed analysis

### 👤 User Management
- Secure user profiles and authentication
- Personalized lifestyle tracking
- Privacy-focused data handling

### 📱 Mobile Application
- Cross-platform React Native app (iOS & Android)
- Intuitive mood logging interface
- Real-time chat integration
- Beautiful SVG backgrounds and animations

## 🏗️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.8+)
- PostgreSQL (or Supabase account)
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)

### Clone Repository

```bash
git clone git@github.com:Thenula09/SOULBUDDY.git
cd SOULBUDDY
```

### Setup Mobile App

```bash
cd SOULBUDDYMobile

# Install dependencies
npm install

# Start Metro bundler
npm start

# In another terminal, run Android
npm run android

# Or run iOS (macOS only)
npm run ios
```

### Setup Backend Services

```bash
cd backend-services

# User Service (Port 8004)
cd user-service
pip install -r requirements.txt
python main.py

# Chat AI Service (Port 8002) - in new terminal
cd ../chat-ai-service
pip install -r requirements.txt
python main.py

# Mood Analytics (Port 8003) - in new terminal
cd ../mood-analytics
pip install -r requirements.txt
python main.py
```

## 🛠️ Tech Stack

### Mobile App
- React Native 0.83.1
- TypeScript
- React Navigation
- React Native SVG
- Zustand (State Management)

### Backend Services
- FastAPI (Python)
- PostgreSQL / Supabase
- SQLAlchemy ORM
- JWT Authentication

## 📝 Documentation

- [Contributing Guidelines](CONTRIBUTING.md)
- [Mood Tracking Setup](MOOD_TRACKING_SETUP_GUIDE.md)
- [Performance Optimizations](PERFORMANCE_OPTIMIZATIONS_2026.md)
- [Repository Structure](REPOSITORY_STRUCTURE.md)

## 📞 Service Ports

- User Service: `8004`
- Chat AI Service: `8002`
- Mood Analytics: `8003`
- API Gateway: TBD

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the terms specified in [LICENSE](LICENSE) file.
