# FinanceTrack

Smart financial control application built with React, TypeScript, and Firebase.

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd FinanceTrack
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Environment Variables**

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Then, fill in your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Sign-In** in Authentication > Sign-in method
4. In Project Settings, copy your web app credentials
5. Paste them into your `.env` file

### Running the Application

**Development:**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

**Build for Production:**
```bash
npm run build
```

**Preview Production Build:**
```bash
npm run preview
```

## Features

- **Email/Password Authentication**: Sign up and log in with email
- **Google Sign-In**: Quick authentication with Google account
- **Dashboard**: Overview of financial data
- **Expense Tracking**: Log and categorize expenses
- **Savings Goals**: Set and track savings targets
- **Reports & Statistics**: Visualize financial trends
- **Calendar View**: Track expenses by date
- **Theme Settings**: Customize app appearance

## Project Structure

```
src/
├── components/        # Reusable UI components
├── contexts/         # React Context (Auth, Theme)
├── lib/             # Firebase config and utilities
├── pages/           # Page components
├── types/           # TypeScript type definitions
└── App.tsx          # Main app component
```

## Security

- Firebase credentials are stored in `.env` file (not committed to git)
- Use `.env.example` as a template for required variables
- Never commit `.env` file to version control

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Firebase** - Backend and authentication
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Data visualization

## License

This project is private and confidential.
