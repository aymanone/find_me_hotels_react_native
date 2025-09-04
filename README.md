# Alghorfa - React Native App

A mobile application to help travelers book hotels through travel agents.

## Features

- User Authentication (Multiple roles: Client, Agent, Admin, Company)
- Travel Request Management
- Hotel Booking System
- Real-time Updates
- Offer Management

## Tech Stack

- React Native with Expo
- Supabase Backend
- React Navigation
- React Native Elements

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI
- Expo Go app on your mobile device

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YourUsername/find_me_hotels_react_native.git
```

2. Install dependencies:
```bash
cd find_me_hotels_react_native
npm install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npx expo start
```

5. Scan the QR code with Expo Go (Android) or the Camera app (iOS)

## Project Structure

```
src/
  ├── components/       # Reusable components
  ├── config/          # Configuration files
  ├── navigation/      # Navigation setup
  ├── screens/         # App screens
  ├── services/        # API services
  └── utils/           # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
