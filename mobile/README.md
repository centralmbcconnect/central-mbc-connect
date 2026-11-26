# Central MBC Connect mobile app

This is the Android/iOS app project, kept beside the live static website. It uses React + Vite + Capacitor and the church's existing Supabase project.

## What is in this first app build

- Mobile navigation for Home, Events, Devotional, Sermons, and Members.
- Public announcements, published events, and sermon/video metadata read from Supabase.
- The 2027 devotional content bundled in the app for offline reading.
- Optional one-hour-before event reminders through device notifications.
- Supabase email/password sign-in. The current Supabase schema protects the church membership directory for administrators only; this app intentionally does not expose those records to ordinary member accounts.

## Requirements

- Node.js 22 or newer.
- Android builds: Android Studio and Android SDK.
- iOS builds: macOS with Xcode. Windows can develop the shared app and Android build, but Apple signing and iOS builds require access to macOS/Xcode.

## First run

From this directory:

```sh
npm install
npm run dev
```

For Android, with Android Studio/SDK installed:

```sh
npx cap add android
npm run cap:sync
npm run android
```

For iOS, on a Mac with Xcode:

```sh
npx cap add ios
npm run cap:sync
npm run ios
```

Commit the generated `android/` and `ios/` platform folders so both platforms stay reproducible. Before public release, finish member-facing content and account access, add launcher/splash assets, test on a physical Pixel and iPhone, and prepare store privacy and support details.

The Supabase URL and publishable key in `src/App.jsx` are public client credentials, matching the website. Never add a service-role key to this app.
