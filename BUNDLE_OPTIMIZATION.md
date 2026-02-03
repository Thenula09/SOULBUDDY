# Bundle Size Optimization Guide

## Analyzing Bundle Size

### Install Bundle Analyzer
```bash
cd SOULBUDDYMobile
npm install --save-dev react-native-bundle-visualizer
```

### Generate Bundle Report
```bash
# For Android
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android.bundle --assets-dest android/app/src/main/res/

# Visualize
npx react-native-bundle-visualizer

# For iOS
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios.bundle

npx react-native-bundle-visualizer ios.bundle
```

## Optimization Techniques

### 1. Remove Unused Dependencies
Check package.json and remove unused libraries:
```bash
npm uninstall <package-name>
```

### 2. Enable ProGuard (Android)
Already configured in `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 3. Use Hermes Engine
Already enabled in `android/gradle.properties`:
```properties
hermesEnabled=true
```

### 4. Lazy Load Heavy Components
```typescript
import React, { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Component() {
  return (
    <Suspense fallback={<Text>Loading...</Text>}>
      <HeavyChart />
    </Suspense>
  );
}
```

### 5. Split Bundles by Screen
Use React Navigation lazy loading:
```typescript
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
```

### 6. Optimize Images
- Use WebP format instead of PNG/JPG
- Compress images before bundling
- Use FastImage for caching

### 7. Tree Shaking
Import only what you need:
```typescript
// ❌ Bad - imports entire library
import _ from 'lodash';

// ✅ Good - imports only what's needed
import debounce from 'lodash/debounce';
```

### 8. Use Native Driver
For animations, always use native driver:
```typescript
Animated.timing(value, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // ✅
}).start();
```

## Expected Bundle Sizes

### Before Optimization
- **Android**: ~2.5 MB
- **iOS**: ~3.0 MB

### After Full Optimization
- **Android**: ~800 KB
- **iOS**: ~1.2 MB

## Monitoring Tools

### 1. Bundle Size Tracker
Add to CI/CD pipeline:
```bash
npx bundlesize
```

### 2. Performance Monitoring
```typescript
import perf from '@react-native-firebase/perf';

const trace = await perf().startTrace('screen_load');
// ... load screen
await trace.stop();
```

### 3. Flipper Integration
Debug bundle size in real-time:
- Install Flipper
- Enable React DevTools plugin
- Monitor component render times

## Best Practices

1. **Avoid Large Libraries**: Use smaller alternatives
   - moment.js → date-fns (2x smaller)
   - lodash → lodash/fp (tree-shakeable)

2. **Code Splitting**: Split by route/feature
   ```typescript
   const routes = {
     Home: { screen: lazy(() => import('./Home')) },
     Profile: { screen: lazy(() => import('./Profile')) },
   };
   ```

3. **Dynamic Imports**: Load on demand
   ```typescript
   const handlePress = async () => {
     const module = await import('./HeavyFeature');
     module.default();
   };
   ```

4. **Remove Console Logs**: In production
   ```javascript
   // babel.config.js
   plugins: [
     ['transform-remove-console', { exclude: ['error', 'warn'] }]
   ]
   ```

5. **Optimize Dependencies**: Use smaller alternatives
   - react-native-vector-icons → expo-icons (if using Expo)
   - axios → fetch (built-in)
   - react-native-calendars → custom picker

## Implementation Checklist

- [x] Hermes enabled
- [x] ProGuard enabled
- [x] New Architecture enabled
- [ ] Bundle analyzer installed
- [ ] Unused dependencies removed
- [ ] Heavy components lazy loaded
- [ ] Images optimized (WebP)
- [ ] Tree shaking verified
- [ ] Console logs removed
- [ ] Bundle size monitored in CI/CD

## Resources

- [React Native Performance](https://reactnative.dev/docs/performance)
- [Metro Bundler Config](https://facebook.github.io/metro/docs/configuration)
- [Hermes Performance](https://hermesengine.dev/)
- [ProGuard Rules](https://developer.android.com/studio/build/shrink-code)
