# 🍳 Recipe Manager

A modern web application for managing and searching cooking recipes with a beautiful, intuitive interface. Store recipes with multiple ingredients, cooking steps, and preparation notes all organized in a secure database.

## Features

✨ **Recipe Management**
- Create, edit, and delete recipes
- Add multiple ingredients with amounts and units
- Separate preparation and cooking steps
- Add extra notes and tips

🔍 **Smart Search**
- Real-time recipe search by name
- Search results with ingredient preview
- Ingredients list shows preparation time

🎨 **Modern UI**
- Clean, dark theme with blue accents
- Responsive design (mobile, tablet, desktop)
- Smooth animations and transitions
- Modal views for detailed recipe viewing

🔐 **Authentication**
- Secure login system
- User session management
- Uses existing database authentication

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MySQL with Sequelize ORM
- **Frontend**: Vanilla JavaScript with modern CSS
- **Authentication**: Session-based with bcrypt hashing

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL Server running locally
- npm (comes with Node.js)

### Installation

1. **Clone or extract the project**
   ```bash
   cd WebApp---Database-for-Hospitals-Proof-of-Concept
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (`.env` file)
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=lsmd_db
   DB_USER=root
   DB_PASS=your_mysql_password
   SESSION_SECRET=your-secret-key
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### Initial Setup

On first run, the application will automatically:
- Connect to your MySQL database
- Create all required tables for recipes, ingredients, and cooking steps
- Keep existing users and authentication system

### Default Admin Account

Use the existing admin credentials from your previous setup:
- The database will automatically sync tables on server start
- Existing users can log in immediately

## Project Structure

```
├── models/              # Sequelize models for database
│   ├── recipe.js       # Recipe model
│   ├── ingredient.js   # Ingredient model
│   ├── recipeIngredient.js  # Relationship table
│   ├── cookingStep.js  # Cooking steps
│   ├── user.js         # User model (existing)
│   └── index.js        # Model configuration
├── public/             # Frontend files
│   ├── index.html      # Main HTML
│   └── app.js          # Frontend JavaScript
├── sql/                # SQL reference files
│   ├── create_tables.sql
│   └── insert_admin.sql
├── server.js           # Express server & API endpoints
├── .env                # Environment configuration
└── package.json        # Dependencies
```

## API Endpoints

### Recipe Endpoints

- `GET /api/recipes` - Get all recipes with preview
- `GET /api/recipes/search/:query` - Search recipes by name
- `GET /api/recipes/:id` - Get full recipe detail
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Authentication Endpoints

- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user info
- `PUT /api/me` - Update profile

## Recipe Data Structure

### Recipe
- ID (auto-increment)
- Name (required)
- Preparation Time (minutes, optional)
- Notes (extra tips, optional)
- Created By (user ID)
- Created At, Updated At

### Ingredients
- Multiple ingredients per recipe
- Amount (with decimal support)
- Unit (g, ml, cup, tbsp, etc.)
- Auto-creates ingredient if new

### Cooking Steps
- Separate preparation and cooking steps
- Ordered by step number
- Free-form text descriptions

## Usage Guide

### Adding a Recipe

1. Click **"+ Add Recipe"** button
2. Enter recipe name (required)
3. Optional: Set preparation time in minutes
4. Add ingredients:
   - Name (required)
   - Amount and Unit (optional)
   - Click "+ Add Ingredient" for more
5. Add preparation steps (optional steps before cooking)
6. Add cooking steps (required at least one)
7. Optional: Add notes or tips
8. Click **"Save Recipe"**

### Searching Recipes

1. Type recipe name in search bar
2. Press Enter or click Search
3. The search bar moves to the top
4. Results show recipe name, prep time, and ingredient preview
5. Click a recipe to view full details

### Viewing Recipe Details

1. Click "View" on any recipe card
2. Full recipe modal opens showing:
   - All ingredients with amounts
   - Preparation steps (if any)
   - Cooking steps
   - Extra notes
3. Click "Delete Recipe" to remove it
4. Click "Close" to go back

### Editing a Recipe

1. Click "Edit" on a recipe card
2. Modify any fields
3. Add/remove ingredients and steps as needed
4. Click "Save Recipe"

## Development

### Running in Development Mode

With auto-reload on file changes:
```bash
npm run dev
```

### Database Management

- Tables are auto-created on first run
- Data persists in MySQL database
- Old patient/document data remains separate
- Recipe tables are new and independent

### Troubleshooting

**Can't connect to database?**
- Check MySQL is running
- Verify DB credentials in `.env`
- Ensure database `lsmd_db` exists or will be created

**Login not working?**
- Verify user exists in database
- Check session secret is set in `.env`
- Clear browser cookies and try again

**Changes not showing?**
- Restart the server: `npm start`
- Clear browser cache (Ctrl+Shift+Delete)
- Check console for errors (F12)

## Notes

- This application uses your existing authentication system
- Previous patient management data remains intact
- Recipe data is stored in new tables
- All data is user-scoped where applicable
- Session expires after 24 hours of inactivity

## License

This is a proof of concept application.
