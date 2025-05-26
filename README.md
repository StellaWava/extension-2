# Course Compare Extension

A browser extension that helps students save and compare university programs as they browse. Built with TypeScript and Manifest V3.

## 🚀 Features

- **Smart Program Detection**: Automatically detects university program pages
- **One-Click Save**: Save programs with extracted details (tuition, duration, deadlines)
- **Side-by-Side Comparison**: Compare multiple programs in a clean table format
- **Freemium Model**: Free tier (3 programs) + Premium tier (unlimited + CSV export)
- **Cross-University**: Works on any university website
- **Local Storage**: All data stays in user's browser

## 📁 Project Structure

```
course-compare-extension/
├── package.json
├── tsconfig.json
├── src/
│   ├── manifest.json
│   ├── background.ts
│   ├── content-script.ts
│   ├── types/
│   │   └── program.ts
│   ├── utils/
│   │   ├── storage.ts
│   │   └── extractor.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts
│   ├── content-scripts/
│   │   └── content-script.css
│   └── assets/
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
└── dist/ (generated after build)
```

## 🛠️ Setup & Build

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. **Clone/Download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create missing asset files**:
   Create icon files in `src/assets/`:
   - `icon16.png` (16x16px)
   - `icon32.png` (32x32px) 
   - `icon48.png` (48x48px)
   - `icon128.png` (128x128px)

   You can use any graduation/education themed icons.

4. **Build the extension**:
   ```bash
   npm run build
   ```

   This will:
   - Compile TypeScript to JavaScript
   - Copy all assets to `dist/` folder
   - Generate production-ready extension

5. **Development mode** (optional):
   ```bash
   npm run watch
   ```
   This watches for TypeScript changes and rebuilds automatically.

### Loading in Browser

#### Chrome/Edge:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

#### Firefox:
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `dist/manifest.json`

## 🎯 How It Works

### For Students:
1. **Browse university websites** - Visit any program page
2. **Save programs** - Click the floating save button or use the popup
3. **Compare** - Open the extension popup and compare saved programs
4. **Export** - Premium users can export comparisons to CSV

### Technical Flow:
1. **Content Script** detects university pages and extracts program data
2. **Background Script** manages storage and cross-tab communication  
3. **Popup** provides the main interface for viewing and comparing programs
4. **Local Storage** keeps all data in the user's browser (no server needed)

## 🔧 Key Components

### ProgramDataExtractor (`utils/extractor.ts`)
- Uses CSS selectors to find program information
- Handles various university website layouts
- Extracts: title, university, tuition, duration, deadlines, GRE requirements

### StorageManager (`utils/storage.ts`)
- Manages Chrome storage API
- Enforces free/premium limits
- Handles program CRUD operations

### Content Script (`content-script.ts`)
- Detects university pages automatically
- Shows floating save button
- Extracts program data on demand

### Popup Interface (`popup/`)
- Lists saved programs
- Comparison modal with side-by-side table
- Premium upgrade prompts

## 🎨 Customization

### Adding New University Patterns
Edit `content-script.ts` in the `detectUniversityPage()` method:

```typescript
const universityPatterns = [
  /\.edu\//,
  /\.ac\.uk\//,
  /your-pattern-here/
];
```

### Adding New Data Fields
1. Update `ProgramData` interface in `types/program.ts`
2. Add extraction logic in `utils/extractor.ts`
3. Update comparison table in `popup/popup.ts`

### Styling Changes
- Main popup: `popup/popup.css`
- Content script button: `content-scripts/content-script.css`

## 🚀 Deployment

### Chrome Web Store:
1. Build the extension: `npm run build`
2. Zip the `dist/` folder
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons:
1. Build the extension: `npm run build`
2. Zip the `dist/` folder  
3. Upload to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

## 💰 Monetization Strategy

### Free Tier:
- Save up to 3 programs
- Basic comparison features
- Local storage only

### Premium Tier ($2/month):
- Unlimited program saves
- CSV export functionality
- Advanced comparison features
- Priority support

## 🔒 Privacy

- **No data collection**: All data stays locally in user's browser
- **No external APIs**: Works entirely offline after installation
- **No tracking**: No analytics or user behavior tracking
- **Transparent**: Open source codebase

## 🐛 Common Issues

### Extension not detecting university pages:
- Check if the URL matches the patterns in `detectUniversityPage()`
- Add new patterns for specific university websites

### Data extraction not working:
- University changed their HTML structure
- Add new CSS selectors to `SELECTORS` in `extractor.ts`

### Build errors:
- Ensure Node.js version is 16+
- Run `npm install` to ensure all dependencies are installed
- Check that all required files exist in `src/`

## 📈 Future Enhancements

- **AI-powered extraction**: Better program data extraction
- **Application tracking**: Deadline reminders and status tracking  
- **Social features**: Share comparisons with friends
- **Mobile app**: Companion mobile application
- **Integration**: Connect with CommonApp and other application platforms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Submit pull request with detailed description

## 📄 License

MIT License - Feel free to use this code for your own projects!

---

**Ready to help students make better university choices! 🎓**