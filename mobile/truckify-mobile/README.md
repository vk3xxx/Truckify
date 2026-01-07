# Truckify Mobile App

Cross-platform mobile app for iOS (iPhone/iPad) and Android built with React Native and Expo.

## Features

- **Authentication**: Login/Register with secure token storage
- **Home Dashboard**: Stats, quick actions, recent activity
- **Jobs**: Browse, filter, and accept freight jobs
- **Tracking**: Real-time GPS tracking with location permissions
- **Profile**: User profile, settings, logout

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Navigation**: Expo Router (file-based routing)
- **State**: React Context API
- **Storage**: Expo SecureStore (encrypted)
- **Location**: Expo Location

## Getting Started

### Prerequisites

- Node.js 18+
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
npm start
```

This opens Expo DevTools. Then:

- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Physical Device**: Scan QR code with Expo Go app

### Run on Specific Platform

```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
mobile/truckify-mobile/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Entry redirect
│   ├── (auth)/            # Auth screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/            # Main app tabs
│       ├── home.tsx
│       ├── jobs.tsx
│       ├── tracking.tsx
│       └── profile.tsx
├── src/
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   └── services/          # API services
│       └── api.ts
├── assets/                # Images, icons
├── app.json              # Expo config
└── package.json
```

## Configuration

### API URL

Set the API URL in environment:

```bash
EXPO_PUBLIC_API_URL=http://your-api-url:8001
```

Or modify `src/services/api.ts` directly.

### App Configuration

Edit `app.json` for:
- App name and slug
- Bundle identifiers (iOS/Android)
- Permissions
- Splash screen
- Icons

## Building for Production

### iOS (App Store)

```bash
npx eas build --platform ios
```

### Android (Play Store)

```bash
npx eas build --platform android
```

### Both Platforms

```bash
npx eas build --platform all
```

## Permissions

### iOS (Info.plist)
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysUsageDescription`

### Android (AndroidManifest.xml)
- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`

## Testing

### On Physical Device

1. Install Expo Go from App Store / Play Store
2. Run `npm start`
3. Scan QR code with Expo Go

### On Simulator/Emulator

```bash
# iOS Simulator (requires Xcode)
npm run ios

# Android Emulator (requires Android Studio)
npm run android
```

## Screens

### Login
- Email/password authentication
- Link to registration

### Register
- User type selection (Driver, Shipper, Fleet Operator, Dispatcher)
- Email/password registration

### Home
- Welcome message
- Availability toggle (drivers)
- Stats grid (jobs, earnings, rating)
- Quick action buttons
- Recent activity feed

### Jobs
- Filter tabs (All, Available, Active)
- Job cards with route, pay, details
- Accept job button

### Tracking
- Map placeholder (ready for integration)
- Current location display
- Active delivery card
- Progress bar
- ETA and distance stats

### Profile
- User avatar and info
- Stats (jobs, rating, membership)
- Menu items (vehicles, documents, payments, etc.)
- Logout button

## Next Steps

- [ ] Integrate real map (react-native-maps)
- [ ] Push notifications
- [ ] Real-time job updates (WebSocket)
- [ ] Document upload
- [ ] Payment integration
- [ ] Offline support
- [ ] Biometric authentication
