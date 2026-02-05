# 🤝 Contributing to SoulBuddy

Thank you for your interest in contributing to SoulBuddy! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

---

## 🌟 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

---

## 🚀 Getting Started

### Prerequisites

- **For Mobile App**: Node.js 18+, React Native environment
- **For Backend**: Python 3.9+, PostgreSQL/Supabase
- Git installed on your system
- Familiarity with the tech stack

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/SOULBUDDY.git
cd SOULBUDDY
```

3. Add upstream remote:
```bash
git remote add upstream https://github.com/Thenula09/SOULBUDDY.git
```

---

## 🔄 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 2. Make Changes

- Work on your feature or fix
- Write tests if applicable
- Follow the coding standards (see below)

### 3. Test Your Changes

**Mobile App:**
```bash
cd SOULBUDDYMobile
npm test
npm run android  # or npm run ios
```

**Backend Services:**
```bash
cd backend-services/[service-name]
pytest  # if tests exist
python main.py  # test locally
```

### 4. Commit Changes

```bash
git add .
git commit -m "type: description"
```

See [Commit Guidelines](#commit-guidelines) below.

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## 📁 Project Structure

```
SOULBUDDY/
├── SOULBUDDYMobile/          # Mobile app - React Native
├── backend-services/          # Backend microservices - FastAPI
│   ├── user-service/
│   ├── chat-ai-service/
│   ├── mood-analytics/
│   └── api-gateway/
└── docs/                      # Documentation
```

When contributing, make changes only in the relevant directory.

---

## 💻 Coding Standards

### React Native (Mobile App)

- Use **TypeScript** for type safety
- Follow **Functional Components** with hooks
- Use **Zustand** for state management
- Component names in **PascalCase**
- File names in **PascalCase** (e.g., `LoginScreen.tsx`)
- Use **ESLint** and **Prettier** for code formatting

Example:
```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  title: string;
}

export const MyComponent: React.FC<Props> = ({ title }) => {
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
};
```

### Python (Backend Services)

- Follow **PEP 8** style guide
- Use **Type hints** where appropriate
- Use **async/await** for async operations
- Function names in **snake_case**
- Class names in **PascalCase**
- Use **Black** for code formatting

Example:
```python
from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()

@router.get("/users/{user_id}")
async def get_user(user_id: int) -> dict:
    """Get user by ID."""
    # Implementation
    return {"id": user_id, "name": "John"}
```

---

## 📝 Commit Guidelines

Use the following format for commit messages:

```
type: subject

body (optional)

footer (optional)
```

### Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples:

```bash
git commit -m "feat: add user profile screen"
git commit -m "fix: resolve mood chart rendering issue"
git commit -m "docs: update API documentation"
```

---

## 🔍 Pull Request Process

### Before Creating PR:

1. ✅ Ensure your code follows the coding standards
2. ✅ Test your changes thoroughly
3. ✅ Update documentation if needed
4. ✅ Rebase on latest `main` branch:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### PR Title Format:

```
[Type] Brief description
```

Examples:
- `[Feature] Add mood analytics dashboard`
- `[Fix] Resolve authentication bug`
- `[Docs] Update setup instructions`

### PR Description Template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring

## Testing
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Backend tests passing
- [ ] No breaking changes

## Screenshots (if applicable)
[Add screenshots]

## Related Issues
Closes #[issue number]
```

### Review Process:

1. At least one maintainer must review
2. All CI checks must pass
3. Address review comments
4. Maintainer will merge once approved

---

## 🐛 Reporting Issues

When reporting bugs, include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: How to recreate the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, device, app version
- **Screenshots**: If applicable

---

## 💡 Feature Requests

For feature requests:

1. Check if feature already requested
2. Describe the feature clearly
3. Explain use case and benefits
4. Add mockups or examples if possible

---

## 📞 Questions?

- Open a [Discussion](https://github.com/Thenula09/SOULBUDDY/discussions)
- Contact maintainers via issues

---

## 🙏 Thank You!

Your contributions make SoulBuddy better for everyone. We appreciate your time and effort! ❤️

---

**Happy Coding!** 🚀
