# Recipe Manager - Database Setup Guide

## Quick Start

### 1. Ensure MySQL is Running

**Windows:**
```bash
# MySQL should be running as a service
# Check Services Manager (Win+R -> services.msc)
# Or start via Command Prompt (as Administrator):
net start MySQL80
```

**macOS (Homebrew):**
```bash
brew services start mysql
```

**Linux:**
```bash
sudo systemctl start mysql
```

### 2. Configure Database Credentials

Edit `.env` file with your MySQL credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lsmd_db
DB_USER=root
DB_PASS=your_actual_password_here
SESSION_SECRET=recipe-manager-secret-key
PORT=3000
```

**Common MySQL Root Password Scenarios:**

- **No password (development):**
  ```
  DB_PASS=
  ```

- **Password is "password":**
  ```
  DB_PASS=password
  ```

- **Password is "root":**
  ```
  DB_PASS=root
  ```

### 3. Create Database (if needed)

If the database doesn't exist, create it manually:

```bash
# Open MySQL CLI
mysql -u root -p

# Then type your password (or just press Enter if no password)

# In MySQL prompt, run:
CREATE DATABASE lsmd_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4. Start the Application

```bash
npm start
```

The server will automatically:
- Create all required tables
- Set up relationships
- Keep existing data intact

## Verification Checklist

- [ ] MySQL service is running
- [ ] Database credentials in `.env` are correct
- [ ] Database `lsmd_db` exists or Sequelize can create it
- [ ] Port 3000 is available
- [ ] Node modules installed (`npm install`)

## Common Issues

### Error: "ER_ACCESS_DENIED_FOR_USER"
- Wrong password in `.env`
- MySQL user doesn't exist
- Try default root with no password

### Error: "ER_BAD_DB_ERROR"
- Database doesn't exist
- Run the CREATE DATABASE command above
- Or let Sequelize create it (check permissions)

### Error: "Port already in use"
- Change `PORT=3000` in `.env` to another port
- Or kill the process using port 3000

### Error: "ECONNREFUSED"
- MySQL is not running
- Wrong DB_HOST (use "localhost" or "127.0.0.1")
- Firewall blocking connection

## Testing the Connection

Run this command to test database connection only:

```bash
node -e "const {sequelize} = require('./models'); sequelize.authenticate().then(() => console.log('✓ DB connected')).catch(e => console.error('✗ Error:', e.message))"
```

## Next Steps

1. Once server starts, go to `http://localhost:3000`
2. Login with existing credentials
3. Start adding recipes!

## Troubleshooting

### Still having issues?

1. Check MySQL is running:
   ```bash
   mysql -u root
   ```

2. Verify connection manually:
   ```bash
   mysql -h localhost -u root -p -e "SELECT 1"
   ```

3. Check `.env` file doesn't have extra spaces:
   ```
   # Good
   DB_USER=root
   DB_PASS=password123
   
   # Bad (spaces after values)
   DB_USER=root 
   DB_PASS=password123 
   ```

4. Double-check case sensitivity (especially on Linux)

## Windows-Specific Help

### Finding MySQL Installation
- Default: `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`
- Alternative: `C:\Program Files (x86)\MySQL\MySQL Server 5.7\bin\mysql.exe`

### Starting MySQL Service
```powershell
# Check if running
Get-Service MySQL80

# Start if not running
Start-Service MySQL80

# Or via Command Prompt (Admin)
net start MySQL80
```

### Check if Port 3000 is in use
```powershell
netstat -ano | findstr :3000
```

## Still Need Help?

1. Check server console output for error messages
2. Verify all `.env` values match your MySQL setup
3. Ensure MySQL user has appropriate permissions:
   ```sql
   GRANT ALL PRIVILEGES ON lsmd_db.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```
