# 💕 Crushit - App Summary

## Overview
**Crushit** is a React Native mobile application designed to help users track and manage their romantic interests in a fun, interactive way. The app combines relationship tracking with gamification elements, providing a unique and engaging user experience.

## Core Concept
Track multiple crushes simultaneously with a life-based system where each crush has 5 lives. Users document positive actions (bonnes actions) and mistakes (erreurs) that affect the relationship's vitality. The app helps maintain perspective and self-awareness in romantic pursuits.

## Key Features

### 📊 Relationship Management
- **Life System**: Each crush starts with 5 lives (hearts)
- **Action Tracking**:
  - Good actions (pros) add positive points
  - Mistakes (cons) remove lives
- **Sentiments Meter**: 0-100 scale to track emotional intensity
- **Status System**: Active, Ended, or Standby relationships
- **Custom Ordering**: Reorganize crushes by priority

### 📝 Documentation & Journaling
- **Personal Journal**: Private diary entries for each crush
- **Action Details**: Add descriptions to both positive actions and mistakes
- **Edit Functionality**: Modify entries and actions after creation
- **Profile Pictures**: Add photos to personalize each crush

### 🎨 Customization
- **Theme Colors**:
  - Customize header color (RGB picker)
  - Customize background color
  - Save up to 2 color presets
  - Reset to default pink theme
- **Font Customization** (4 categories):
  - **Noms (Names)**: Customize crush names font
  - **En-têtes (Headers)**: Customize screen headers
  - **Éléments (Items)**: Customize list items and content
  - **Titres (Titles)**: Customize section titles
  - 11 beautiful fonts available (Dancing Script, Caveat, Pacifico, Lobster, Satisfy, etc.)
  - Live preview of font changes
- **Dynamic UI**: Theme and font updates apply across all screens instantly

### 🗂️ Organization Features
- **Archive System**: Store ended relationships separately
- **Cemetery**: View "game over" crushes (0 lives remaining)
- **Reorder Mode**: Drag and drop to reorganize crush list
- **Search & Filter**: Quick access to specific crushes

### 🔒 Security & Privacy
- **Password Protection**:
  - Optional app lock on launch
  - Auto-lock when app goes to background
  - Create, change, or remove password from settings
- **Secure Storage**: Password hashing with salt
- **Data Encryption**: All crush data stored securely

### 🎭 Easter Eggs & Fun Features
- **Secret Revival**: Hidden feature to restore destroyed crushes (tap header 7 times)
- **Relationship Oracle**: Long-press the add button for mysterious predictions
- **Trait Flags**: Double-tap quality/defect sections for animated celebrations
- **Danger Zone Warning**: Special alert when a crush reaches 1 life

## User Flow

### Adding a New Crush
1. Tap the floating + button
2. Enter name and optional description
3. Crush starts with 5 lives and 50% sentiments
4. Add optional profile picture

### Tracking Actions
1. Open crush detail screen
2. Add good actions to celebrate positive moments
3. Document mistakes (removes lives)
4. Adjust sentiments slider as feelings evolve
5. Add qualities and defects

### Journaling
1. Access journal from crush detail screen
2. Create diary entries with title and description
3. View entry history with timestamps
4. Edit or delete entries as needed

### Managing Status
1. Set relationship to Active, Ended, or Standby
2. Ended crushes move to archive automatically
3. Crushes with 0 lives move to cemetery
4. Archive and cemetery accessible from settings

## Technical Highlights

### Platform
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Native Stack)
- **State Management**: React Hooks (useState, useEffect)
- **Persistence**: AsyncStorage for local data

### Key Libraries
- **@react-native-community/slider**: Sentiments and color pickers
- **expo-image-picker**: Profile picture functionality
- **@expo-google-fonts**: 11 beautiful font families for customization:
  - Dancing Script, Caveat, Pacifico, Lobster, Satisfy
  - Indie Flower, Permanent Marker, Sacramento
  - Shadows Into Light, Architects Daughter
- **expo-linear-gradient**: Visual enhancements
- **react-native-svg**: Heart animations

### Architecture
- **Screens**:
  - `CrushListScreen` - Main list view
  - `CrushDetailScreen` - Individual crush details
  - `DiaryScreen` - Personal journal
  - `LockScreen` - Password authentication
- **Utils**:
  - `storage.js` - Data persistence and password management
  - `sanitize.js` - Input validation and security
  - `translations.js` - Bilingual support (French/English)

### Security Features
- Password hashing with custom salt
- Input sanitization to prevent injection attacks
- Data validation on save/load operations
- Backup system for data corruption recovery
- Size limits to prevent storage overflow

## Data Model

### Crush Object
```javascript
{
  id: "unique-id",
  name: "Crush Name",
  description: "Optional description",
  mistakes: 0-5,
  pros: [{id, title, description, createdAt}],
  cons: [{id, title, description, createdAt}],
  qualities: [{id, text}],
  defects: [{id, text}],
  feelings: 0-100,
  order: number,
  status: "active" | "ended" | "standby",
  diaryEntries: [{id, title, description, createdAt}],
  picture: "uri or null",
  createdAt: "ISO date"
}
```

## Visual Design

### Color Palette
- **Default Theme**: Pink (#FF6B9D)
- **Default Background**: Light pink (#FFF0F5)
- **Customizable**: Full RGB spectrum via color picker

### Typography
- **Fully Customizable**: Choose from 11 Google Fonts for each UI category
- **Default Fonts**:
  - **Names**: Dancing Script (elegant, handwritten)
  - **Headers**: Dancing Script (elegant, handwritten)
  - **Items**: System (readable, clean)
  - **Titles**: Dancing Script (elegant, handwritten)
- **Font Categories**:
  - Noms (Crush names in lists)
  - En-têtes (Screen headers)
  - Éléments (Content, actions, diary entries)
  - Titres (Section titles, modal titles)

### Iconography
- Hearts (♥) for lives
- Emoji icons for settings options
- Material Icons for actions and buttons

## User Experience

### Animations
- Heart explosions when crush is destroyed
- Pac-Man easter egg animation
- Smooth transitions between screens
- Live color preview in color picker

### Feedback
- Visual indicators for all actions
- Confirmation dialogs for destructive actions
- Toast-style alerts for success/error states
- Haptic feedback for important interactions

## Privacy & Data
- All data stored locally on device
- No external servers or cloud sync
- Optional password protection
- User controls all data deletion
- No analytics or tracking

## Future Potential
The app architecture supports future features such as:
- Data export/import
- Cloud backup (optional)
- Relationship statistics and insights
- Reminder notifications
- Multiple user profiles
- Relationship comparison tools

---

**Version**: 1.3.0
**Platform**: iOS & Android (via Expo)
**License**: Private
**Built with**: React Native, Expo, and ❤️

## Changelog

### v1.3.0 (2025-11-27)
**New Features:**
- 🎯 **App Renamed**: "Crush Life" is now **Crushit**
- ✅ **Comprehensive Test Suite**: 346 tests with high coverage
  - DiaryScreen.js: 100% line coverage
  - LockScreen.js: 97.43% coverage
  - storage.js: 98.44% coverage
  - sanitize.js & translations.js: 100% coverage

**Improvements:**
- Complete test coverage for delete, edit, and modal interactions
- Storage validation tests for all data types
- Improved useFocusEffect testing with proper mocks
- Header title render function coverage

**Technical:**
- Updated bundle identifiers to com.crushit.app
- Updated package name and slug

### v1.2.0 (2025-11-15)
**New Features:**
- 🎨 **Font Customization System**: 4 independent font categories (Names, Headers, Items, Titles)
- 📝 **11 Google Fonts**: Beautiful typography options including Dancing Script, Caveat, Pacifico, and more
- 🔄 **Live Font Preview**: Instant updates across all screens
- 💾 **Font Persistence**: Custom font choices saved automatically

**Improvements:**
- Enhanced test coverage (78.1% passing tests)
- Updated test suite for new data structure
- Code cleanup and optimization
- Improved .gitignore for better repository management

**Bug Fixes:**
- Fixed fontWeight conflicts with custom fonts
- Improved modal and settings organization
- Better font loading and caching

### v1.1.0 (Previous)
- Initial release with qualities, defects, feelings slider, and reorder features
