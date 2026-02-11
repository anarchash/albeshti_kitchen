# Kitchen Item Search Website

A beautiful, modern web application to search and browse through all your kitchen items.

## Features

- 🔍 **Smart Search**: Search by item name, category, or tags
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 🖼️ **Image Gallery**: View all your kitchen items in a grid layout
- ⚡ **Fast & Lightweight**: Pure HTML, CSS, and JavaScript - no frameworks needed

## Setup Instructions

1. **Add Your Images**:
   - Create an `images` folder in this directory
   - Add photos of your kitchen items to the `images` folder
   - Name them descriptively (e.g., `wooden-spoon.jpg`, `coffee-mug.jpg`)

2. **Update the Data**:
   - Open `data.js`
   - Replace the sample items with your actual kitchen items
   - For each item, add:
     ```javascript
     {
         name: "Item Name",
         category: "Category",
         image: "images/your-image.jpg",
         tags: ["tag1", "tag2", "tag3"]
     }
     ```

3. **Open the Website**:
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js (if you have http-server installed)
     npx http-server
     ```
   - Then visit `http://localhost:8000` in your browser

## File Structure

```
kitchen/
├── index.html      # Main HTML file
├── styles.css      # Styling and layout
├── script.js       # Search functionality
├── data.js         # Your kitchen items data
├── images/         # Your kitchen item photos (create this folder)
└── README.md       # This file
```

## Customization

- **Colors**: Edit the CSS variables in `styles.css` (lines 4-11)
- **Grid Layout**: Adjust `grid-template-columns` in `.items-grid` (styles.css)
- **Search**: Modify the search logic in `script.js` if needed

## Comments (anyone can post)

Anyone can add a comment on an item’s detail page; comments are shown to everyone. The site uses **Firebase** (Firestore + Anonymous Auth) so visitors don’t need an account—they’re signed in as “Guest” when they post.

**To enable comments:**

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com).
2. **Enable Firestore**: in the project, go to Build → Firestore Database → Create database (start in test mode, then secure with the rules below).
3. **Enable Anonymous sign-in**: Build → Authentication → Sign-in method → Anonymous → Enable.
4. **Get your config**: Project settings (gear) → General → “Your apps” → add a web app if needed → copy the `firebaseConfig` object.
5. **Set config in the site**: In `script.js`, set `FIREBASE_CONFIG` at the top to that object, e.g.:
   ```javascript
   var FIREBASE_CONFIG = {
     apiKey: '...',
     authDomain: '...',
     projectId: '...',
     storageBucket: '...',
     messagingSenderId: '...',
     appId: '...'
   };
   ```
6. **Firestore rules**: In the Firestore console, go to Rules and paste the contents of `firestore.rules` from this repo (or use the same rules: anyone can read; only authenticated users can create comments under `item-comments/{itemSlug}/comments`, with `text` string ≤ 500 chars).

## Tips

- Use descriptive filenames for your images
- Add multiple tags to items for better search results
- Organize items by category for easier browsing
- Keep image file sizes reasonable for faster loading

Enjoy organizing your kitchen! 🍳
