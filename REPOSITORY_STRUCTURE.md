# 📁 SoulBuddy Repository Structure

This document explains the organization of the SoulBuddy project within a single repository.

## 🏛️ Main Repository: SOULBUDDY
**Repository**: [https://github.com/Thenula09/SOULBUDDY](https://github.com/Thenula09/SOULBUDDY)

**Purpose**: Monorepo containing all SoulBuddy components

**Structure**:
```
SOULBUDDY/
├── SOULBUDDYMobile/          # Mobile Application
├── backend-services/          # Backend Microservices
├── docs/                      # Documentation
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## 📱 Mobile Application: SOULBUDDYMobile

**Location**: `/SOULBUDDYMobile`

**Technology**: React Native (iOS & Android)

**Features**:
- User authentication screens (Login, Register, Forgot Password)
- Mood logging interface with timeline visualization
- AI chat integration
- User profile management
- Mood analytics dashboard
- Beautiful SVG backgrounds and animations

**Key Dependencies**:
- React Native 0.83.1
- React Navigation
- React Native SVG
- Axios for API calls
- Zustand for state management

**Getting Started**:
```bash
cd SOULBUDDYMobile
npm install
npm start
npm run android  # or npm run ios
```

---

## 🔧 Backend Services: backend-services

**Location**: `/backend-services`

**Technology**: FastAPI (Python), PostgreSQL (Supabase)

### Services:

#### 1. **API Gateway** (Port: TBD)
**Location**: `/backend-services/api-gateway`
- Routes requests to appropriate microservices
- Authentication middleware
- Rate limiting and security

#### 2. **User Service** (Port: 8004)
**Location**: `/backend-services/user-service`
- User registration and authentication
- Profile management
- User preferences and settings

**Getting Started**:
```bash
cd backend-services/user-service
pip install -r requirements.txt
python main.py
```

#### 3. **Chat AI Service** (Port: 8002)
**Location**: `/backend-services/chat-ai-service`
- AI-powered chat conversations
- Emotion detection
- Context-aware responses
- Integration with OpenAI/Gemini

**Getting Started**:
```bash
cd backend-services/chat-ai-service
pip install -r requirements.txt
python main.py
```

#### 4. **Mood Analytics Service** (Port: 8003)
**Location**: `/backend-services/mood-analytics`
- Mood entry logging and retrieval
- 5-minute interval tracking
- Mood pattern analysis
- Lifestyle correlation analytics
- Historical data visualization

**Getting Started**:
```bash
cd backend-services/mood-analytics
pip install -r requirements.txt
python main.py
```

---

## 🚀 Development Workflow

### Clone Repository

```bash
git clone git@github.com:Thenula09/SOULBUDDY.git
cd SOULBUDDY
```

### Work on Mobile App

```bash
cd SOULBUDDYMobile
# Make changes...
git add .
git commit -m "Update mobile app"
git push
```

### Work on Backend

```bash
cd backend-services/user-service
# Make changes...
cd ../..  # Back to root
git add .
git commit -m "Update user service"
git push
```

---

## 📞 Communication Between Services

```
Mobile App (Ports: varies)
    ↓
API Gateway (Port: TBD)
    ↓
    ├─→ User Service (Port: 8004)
    ├─→ Chat AI Service (Port: 8002)
    └─→ Mood Analytics Service (Port: 8003)
```

---

## 🤝 Contributing

Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines that apply across all components.

---

## 📝 License

This project is licensed under the terms specified in [LICENSE](LICENSE) file.
