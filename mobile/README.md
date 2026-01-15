# Truckify Mobile App

Modern React Native mobile application for the Truckify trucking platform, built with Expo.

## 🚀 Features

### Core Functionality
- **Authentication**: Email/password login with biometric support (Face ID/Touch ID)
- **Dashboard**: Real-time stats and job overview
- **Job Management**: Browse, filter, and manage jobs
- **Real-time Tracking**: GPS-based live tracking with maps
- **User Profiles**: Manage settings and preferences

### Technical Features
- ✅ Cross-platform (iOS & Android)
- ✅ React Native + Expo
- ✅ TypeScript for type safety
- ✅ React Query for data management
- ✅ Secure token storage
- ✅ Biometric authentication
- ✅ Real-time location tracking
- ✅ Push notifications ready
- ✅ Offline support ready

---

## 📱 Tech Stack

```
React Native (0.81.5)
├── Expo SDK (54)
├── TypeScript (5.9)
├── React Navigation (7)
├── React Query (5)
├── Axios (API client)
├── Expo Location (GPS)
├── Expo Maps (Tracking)
├── Expo Secure Store (Token storage)
└── Expo Local Authentication (Biometrics)
```

---

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── api/               # API client and endpoints
│   │   ├── client.ts      # Axios instance with interceptors
│   │   ├── auth.ts        # Auth API + biometric integration
│   │   ├── jobs.ts        # Jobs API
│   │   └── index.ts       # Exports
│   │
│   ├── context/           # React Context
│   │   └── AuthContext.tsx  # Auth state management
│   │
│   ├── navigation/        # Navigation setup
│   │   └── AppNavigator.tsx # Stack + Tab navigation
│   │
│   ├── screens/           # App screens
│   │   ├── LoginScreen.tsx      # Login with biometrics
│   │   ├── RegisterScreen.tsx   # User registration
│   │   ├── DashboardScreen.tsx  # Main dashboard
│   │   ├── JobsScreen.tsx       # Job listings
│   │   ├── TrackingScreen.tsx   # GPS tracking
│   │   └── ProfileScreen.tsx    # User profile
│   │
│   ├── components/        # Reusable components
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
│
├── App.tsx                # App entry point
├── app.json               # Expo configuration
└── package.json           # Dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS: macOS with Xcode
- Android: Android Studio

### Installation

1. **Navigate to mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

### Running on Devices

**iOS Simulator**:
```bash
npm run ios
```

**Android Emulator**:
```bash
npm run android
```

**Physical Device**:
1. Install "Expo Go" app from App Store/Play Store
2. Scan QR code from terminal
3. App will load on your device

---

## 🔧 Configuration

### API Endpoint

Update the API URL in `src/api/client.ts`:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://localhost:8080/api/v1'  // Development
  : 'https://api.truckify.com/api/v1';  // Production
```

**Note**: For iOS simulator, use `localhost`. For Android emulator, use `10.0.2.2` instead of `localhost`.

### Environment Variables

Create a `.env` file (optional):
```env
API_URL=http://localhost:8080/api/v1
GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

## 📲 Features Deep Dive

### 1. Authentication

**Login Methods**:
- Email + Password
- Biometric (Face ID/Touch ID)

**Flow**:
```
Login → Store tokens in SecureStore → Auto-refresh tokens → Navigate to Dashboard
```

**Security**:
- JWT tokens stored in Expo SecureStore
- Automatic token refresh on 401
- Secure biometric authentication

### 2. Dashboard

**Driver View**:
- Available jobs count
- Active jobs count
- In-transit count
- Completed count

**Shipper View**:
- Active shipments
- In-transit count
- Delivered count
- Total value

### 3. Job Management

**Features**:
- Filter by status (pending, assigned, in_transit, delivered)
- Pull-to-refresh
- Detailed job cards with route visualization
- Real-time updates

### 4. GPS Tracking

**Capabilities**:
- Real-time location tracking
- Route visualization on map
- Speed monitoring
- Background location updates (when implementing)

**Permissions**:
- iOS: `NSLocationWhenInUseUsageDescription`
- Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`

### 5. Biometric Authentication

**Supported**:
- iOS: Face ID, Touch ID
- Android: Fingerprint, Face Unlock

**Setup**:
1. User logs in with password
2. Enable biometrics in Profile
3. Password stored securely in SecureStore
4. Future logins use biometric authentication

---

## 🎨 UI/UX

### Design System

**Colors**:
- Primary: `#22c55e` (Green)
- Background: `#0a0a0a` (Almost Black)
- Cards: `#171717` (Dark Gray)
- Borders: `#262626` (Medium Gray)
- Text: `#ffffff` (White)
- Muted: `#6b7280` (Light Gray)

**Typography**:
- System fonts for best native feel
- Font sizes: 12-32px
- Weights: 400, 600, 700

**Components**:
- Cards with subtle borders
- Rounded corners (12-16px)
- Touch feedback on all interactions
- Native tab navigation
- Bottom sheets for modals

---

## 📦 Building for Production

### iOS

1. **Configure EAS Build**:
   ```bash
   eas build:configure
   ```

2. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

3. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

### Android

1. **Build for Android**:
   ```bash
   eas build --platform android
   ```

2. **Submit to Play Store**:
   ```bash
   eas submit --platform android
   ```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with email/password
- [ ] Login with biometrics
- [ ] Register new account
- [ ] View dashboard stats
- [ ] Browse jobs with filters
- [ ] View job details
- [ ] GPS tracking with location
- [ ] Update profile settings
- [ ] Enable/disable notifications
- [ ] Logout

### Device Testing

Test on:
- iOS: iPhone 12+ (iOS 15+)
- Android: Pixel 5+ (Android 11+)
- Tablets: iPad, Android Tablet

---

## 🔐 Security Best Practices

1. **Tokens**: Stored in Expo SecureStore (encrypted)
2. **Biometrics**: System-level authentication
3. **API Calls**: HTTPS only in production
4. **Sensitive Data**: Never logged or cached
5. **Permissions**: Request only when needed

---

## 🚧 Roadmap

### Phase 1 (Current)
- ✅ Authentication
- ✅ Dashboard
- ✅ Job listings
- ✅ GPS tracking
- ✅ User profile

### Phase 2 (Next)
- [ ] Push notifications
- [ ] Document camera scanning
- [ ] Offline mode
- [ ] In-app messaging
- [ ] Route optimization

### Phase 3 (Future)
- [ ] Payment integration
- [ ] Document management
- [ ] Analytics
- [ ] Fleet management
- [ ] Advanced filtering

---

## 🐛 Troubleshooting

### Common Issues

**Metro bundler cache**:
```bash
expo start -c
```

**iOS build fails**:
```bash
cd ios && pod install && cd ..
```

**Android location not working**:
- Use `10.0.2.2:8080` instead of `localhost:8080` for emulator

**Biometrics not available**:
- Check device has biometric hardware
- Ensure biometrics are enrolled in device settings

---

## 📚 Documentation

- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Query](https://tanstack.com/query/latest)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)

---

## 👥 Development Team

- **Architecture**: React Native + Expo
- **State Management**: React Query + Context API
- **Navigation**: React Navigation
- **API**: Axios with interceptors

---

## 📄 License

Copyright © 2026 Truckify. All rights reserved.

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test on both iOS and Android
4. Submit pull request

---

**Built with ❤️ using React Native + Expo**
