# Crush Life - iPhone App

An iPhone app to track your crushes, their good and bad actions, and monitor your mistakes. After 5 mistakes, a crush is automatically destroyed and removed from your list.

## Features

- **Crush List**: View all your crushes with their mistake counts
- **Mistake Tracking**: Visual indicator showing remaining lives (5 total)
- **Pros & Cons Lists**: Separate lists for good actions and bad actions/mistakes
- **Auto-Destruction**: Crushes are automatically removed after 5 mistakes
- **Local Storage**: All data is saved locally on your device using AsyncStorage

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Expo Go app on your iPhone (download from App Store)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Scan the QR code with your iPhone camera or Expo Go app

## Usage

### Adding a Crush
1. Tap the **+** button on the main screen
2. Enter the crush's name
3. Tap "Add"

### Adding Good Actions (Pros)
1. Tap on a crush to view details
2. Tap the **+** button in the "Good Actions" section
3. Enter what they did right
4. Tap "Add"

### Adding Bad Actions / Mistakes (Cons)
1. Tap on a crush to view details
2. Tap the **+** button in the "Bad Actions / Mistakes" section
3. Enter what mistake happened
4. Tap "Add"
5. **Note**: This will count as a mistake and reduce their remaining lives

### Removing Actions
- Long press on any action item to remove it
- Removing a bad action will restore one life

### Deleting a Crush
- Long press on a crush in the main list to delete them manually
- Crushes are automatically deleted after reaching 5 mistakes

## App Structure

```
crush-life/
├── App.js                          # Main app entry with navigation
├── src/
│   ├── screens/
│   │   ├── CrushListScreen.js     # Main list of crushes
│   │   └── CrushDetailScreen.js   # Crush details with pros/cons
│   └── utils/
│       └── storage.js             # AsyncStorage helper functions
├── package.json
└── app.json
```

## Data Structure

Each crush is stored with the following structure:
```javascript
{
  id: string,
  name: string,
  mistakes: number,        // 0-5, auto-destroyed at 5
  pros: Array,            // Good actions
  cons: Array,            // Bad actions/mistakes
  createdAt: string
}
```

## Tech Stack

- React Native
- Expo
- React Navigation
- AsyncStorage

## Color Scheme

- Primary: #FF6B9D (Pink)
- Background: #FFF0F5 (Light Pink)
- Good Actions: #E8F5E9 (Light Green)
- Bad Actions: #FFEBEE (Light Red)
- Destroyed: #333 (Dark Gray)

## Future Enhancements

- Add photos for crushes
- Export data to JSON/CSV
- Add notes section
- Set custom mistake limits
- Add statistics and insights
- Cloud sync
