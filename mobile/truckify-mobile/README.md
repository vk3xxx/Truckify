# Truckify Mobile App

Cross-platform mobile app for iOS (iPhone/iPad) and Android built with React Native and Expo SDK 54.

## Features

- **Authentication**: Email/password, biometric (Face ID/Touch ID), passkeys/WebAuthn
- **Job Management**: Browse, filter, accept, and track freight jobs
- **Real-Time Tracking**: Live GPS with OSRM road routing on maps
- **Documents**: Upload license, insurance, vehicle registration
- **Proof of Delivery**: Photo capture, signature pad, recipient name
- **Invoices**: Payment history with status tracking
- **Messaging**: E2E encrypted chat with shippers/dispatchers (3-way key escrow)
- **Push Notifications**: Job alerts, delivery updates with deep linking
- **Offline Support**: Queue actions when disconnected, auto-sync
- **Multi-Language**: English, Spanish, Swahili

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **State**: React Context API
- **Storage**: Expo SecureStore (encrypted), AsyncStorage (cache)
- **Location**: Expo Location with background tracking
- **Maps**: react-native-maps with OSRM routing
- **Crypto**: expo-crypto for E2E encryption
- **Testing**: Jest with 37 tests

## Getting Started

### Prerequisites

- Node.js 20+
- Expo Go app on your phone (for testing)
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)

### Install Dependencies

```bash
cd mobile/truckify-mobile
npm install
```

### Start Development Server

```bash
npx expo start
```

Then:
- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Physical Device**: Scan QR code with Expo Go app

## Project Structure

```
mobile/truckify-mobile/
├── app/                       # Expo Router pages
│   ├── _layout.tsx           # Root layout with notifications
│   ├── index.tsx             # Entry redirect
│   ├── delivery-complete.tsx # POD capture screen
│   ├── (auth)/               # Auth screens
│   │   ├── login.tsx         # Login with biometric/passkey
│   │   └── register.tsx      # Registration with passkey option
│   └── (tabs)/               # Main app tabs
│       ├── _layout.tsx       # Tab navigation
│       ├── home.tsx          # Dashboard
│       ├── jobs.tsx          # Job listings
│       ├── tracking.tsx      # GPS tracking with map
│       ├── documents.tsx     # Document management
│       ├── invoices.tsx      # Payment history
│       ├── messages.tsx      # E2E encrypted chat
│       ├── notifications.tsx # Notification center
│       └── profile.tsx       # Settings & language
├── src/
│   ├── __tests__/            # Jest tests
│   │   ├── api.test.ts
│   │   ├── chat.test.ts
│   │   ├── documents.test.ts
│   │   ├── encryption.test.ts
│   │   └── offline.test.ts
│   ├── __mocks__/            # Test mocks
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state with all methods
│   └── services/
│       ├── api.ts            # API client
│       ├── biometric.ts      # Face ID/Touch ID
│       ├── chat.ts           # WebSocket messaging
│       ├── documents.ts      # Document upload
│       ├── encryption.ts     # E2E encryption
│       ├── i18n.ts           # Internationalization
│       ├── location.ts       # GPS tracking
│       ├── notifications.ts  # Push notifications
│       ├── offline.ts        # Offline queue
│       └── passkey.ts        # WebAuthn/Passkey
├── assets/images/            # App icons, splash
├── app.json                  # Expo config
├── eas.json                  # EAS Build config
├── jest.config.js            # Test config
└── package.json
```

## Configuration

### API URL

Set in `src/services/api.ts`:
```typescript
const API_URL = 'http://your-api-url:8001';
```

### App Configuration (app.json)

- Bundle ID: `com.truckify.mobile`
- Dark theme by default
- iOS: Face ID, camera, photo, location permissions
- Android: Biometric, camera, location permissions

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage: 5 suites, 37 tests**
- API service tests
- Chat/WebSocket tests
- Document upload tests
- E2E encryption tests
- Offline caching tests

## Building for Production

### Configure EAS

```bash
npx eas login
npx eas build:configure
```

### Build for App Stores

```bash
# iOS (App Store)
npx eas build --platform ios --profile production

# Android (Play Store)
npx eas build --platform android --profile production

# Preview builds (internal testing)
npx eas build --platform all --profile preview
```

## Screens

### Authentication
- **Login**: Email/password, biometric toggle, passkey login
- **Register**: User type selection, passkey registration option

### Main Tabs
- **Home**: Stats, quick actions, availability toggle
- **Jobs**: Filter by status, accept jobs, view details
- **Tracking**: Live map with route, stops, truck position
- **Documents**: Upload/manage license, insurance, registration
- **Invoices**: Payment history, paid/unpaid filters
- **Messages**: E2E encrypted chat with 🔒 indicators
- **Profile**: Settings, language selector, security options

### Other Screens
- **Delivery Complete**: Photo POD, signature capture, recipient name

## Services

### Authentication
- JWT token management with auto-refresh
- Biometric login (Face ID, Touch ID, Fingerprint)
- Passkey/WebAuthn support

### E2E Encryption
- 3-way key escrow (sender, recipient, admin)
- Per-message session keys
- expo-crypto for secure randomness

### Offline Support
- Cache jobs, profile data locally
- Queue actions when offline
- Auto-sync when back online

### Push Notifications
- Expo Notifications
- Deep linking to relevant screens
- Notification preferences

## Permissions

### iOS
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysUsageDescription`
- `NSFaceIDUsageDescription`
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`

### Android
- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `CAMERA`
- `USE_BIOMETRIC`
- `USE_FINGERPRINT`

## Multi-Language Support

Supported languages:
- English (en)
- Spanish (es) - Español
- Swahili (sw) - Kiswahili

Change language in Profile → Language settings.
