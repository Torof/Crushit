# 💕 Crushit

A React Native mobile app to track your crushes with a gamified life system. Each crush has 5 lives - document good actions and mistakes to see how your relationships evolve!

## Features

### Core Functionality
- **Life System**: Each crush starts with 5 hearts - mistakes cost lives!
- **Action Tracking**: Record good actions (pros) and mistakes (cons)
- **Sentiments Meter**: 0-100 scale to track your emotional intensity
- **Status Management**: Active, Ended, or Standby relationships
- **Personal Journal**: Private diary entries for each crush

### Customization
- **Theme Colors**: Customize header and background colors with RGB picker
- **Font Selection**: 11 beautiful Google Fonts across 4 UI categories
- **Color Presets**: Save up to 2 custom color schemes
- **Profile Pictures**: Add photos to personalize each crush

### Organization
- **Archive System**: Store ended relationships separately
- **Cemetery**: View "game over" crushes (0 lives)
- **Drag & Drop Reorder**: Organize crushes by priority
- **Qualities & Defects**: Track personality traits

### Security
- **Password Protection**: Optional app lock
- **Secure Storage**: Password hashing with salt
- **Input Validation**: Protection against injection attacks
- **Local Data**: All data stays on your device

### Easter Eggs
- **Secret Revival**: Tap header 7 times to restore destroyed crushes
- **Relationship Oracle**: Long-press add button for predictions
- **Trait Flags**: Double-tap qualities/defects for celebrations

## Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Expo CLI
- Expo Go app on your device

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

## Usage

### Adding a Crush
1. Tap the floating **+** button
2. Enter name and optional description
3. Add a profile picture (optional)

### Tracking Actions
1. Open crush detail screen
2. Add good actions to celebrate wins
3. Document mistakes (costs lives!)
4. Adjust sentiments slider as feelings evolve

### Journaling
1. Access journal from crush detail screen
2. Create entries with title and description
3. Edit or delete entries as needed

## Tech Stack

- **Framework**: React Native + Expo
- **Navigation**: React Navigation (Native Stack)
- **Storage**: AsyncStorage + Expo SecureStore
- **Fonts**: @expo-google-fonts (11 families)
- **Testing**: Jest + React Native Testing Library

## Project Structure

```
crushit/
├── App.js                      # Main entry with navigation
├── src/
│   ├── screens/
│   │   ├── CrushListScreen.js  # Main crush list
│   │   ├── CrushDetailScreen.js # Crush details
│   │   ├── DiaryScreen.js      # Personal journal
│   │   └── LockScreen.js       # Password auth
│   └── utils/
│       ├── storage.js          # Data persistence
│       ├── sanitize.js         # Input validation
│       └── translations.js     # i18n (FR/EN)
├── __tests__/                  # Test files
└── coverage/                   # Test coverage reports
```

## Test Coverage

| File | Statements | Lines |
|------|------------|-------|
| DiaryScreen.js | 100% | 100% |
| storage.js | 98.44% | 99.56% |
| LockScreen.js | 97.43% | 97.43% |
| sanitize.js | 100% | 100% |
| translations.js | 100% | 100% |

**346 tests passing**

## Color Scheme

- **Primary**: #FF6B9D (Pink)
- **Background**: #FFF0F5 (Light Pink)
- **Good Actions**: #E8F5E9 (Light Green)
- **Bad Actions**: #FFEBEE (Light Red)
- **Customizable**: Full RGB spectrum

## Languages

- French (default)
- English

## Version

**1.3.0** - See [APP_SUMMARY.md](APP_SUMMARY.md) for full changelog.

## License

Private
