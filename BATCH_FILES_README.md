# 🚀 LabSys - Quick Start Scripts

This folder contains convenient batch files to manage your LabSys application on Windows.

---

## 📁 Available Scripts

### 1. **install.bat** - Install Dependencies
**Purpose:** Installs all required npm packages for both backend and frontend.

**Usage:**
```bash
# Double-click the file or run from command prompt:
install.bat
```

**What it does:**
- ✅ Checks if Node.js is installed
- ✅ Installs backend dependencies (server folder)
- ✅ Installs frontend dependencies (client folder)
- ✅ Shows installation progress
- ✅ Displays next steps

**When to use:**
- First time setup
- After pulling new code with updated dependencies
- When dependencies are missing or corrupted

---

### 2. **start-servers.bat** - Start Both Servers
**Purpose:** Starts both backend and frontend servers simultaneously.

**Usage:**
```bash
# Double-click the file or run from command prompt:
start-servers.bat
```

**What it does:**
- ✅ Checks Node.js installation
- ✅ Starts backend server (http://localhost:5000)
- ✅ Starts frontend server (http://localhost:5173)
- ✅ Opens two separate terminal windows
- ✅ Automatically opens browser to http://localhost:5173

**When to use:**
- Daily development work
- Quick testing
- Demonstrations

**Note:** Two terminal windows will open - one for backend, one for frontend. Keep both running!

---

### 3. **start-backend.bat** - Start Backend Only
**Purpose:** Starts only the backend server.

**Usage:**
```bash
# Double-click the file or run from command prompt:
start-backend.bat
```

**What it does:**
- ✅ Starts backend server on http://localhost:5000
- ✅ Shows server logs in terminal

**When to use:**
- Testing API endpoints
- Backend development
- When frontend is already running

---

### 4. **start-frontend.bat** - Start Frontend Only
**Purpose:** Starts only the frontend development server.

**Usage:**
```bash
# Double-click the file or run from command prompt:
start-frontend.bat
```

**What it does:**
- ✅ Starts frontend server on http://localhost:5173
- ✅ Shows Vite dev server logs

**When to use:**
- Frontend development
- UI/UX work
- When backend is already running

---

### 5. **stop-servers.bat** - Stop All Servers
**Purpose:** Stops all running Node.js servers.

**Usage:**
```bash
# Double-click the file or run from command prompt:
stop-servers.bat
```

**What it does:**
- ✅ Kills all Node.js processes
- ✅ Stops both backend and frontend servers

**When to use:**
- When you're done working
- Before system shutdown
- To restart servers cleanly

**⚠️ Warning:** This will stop ALL Node.js processes on your system!

---

## 🎯 Quick Start Guide

### First Time Setup:

1. **Install Dependencies**
   ```bash
   install.bat
   ```

2. **Configure Environment**
   - Copy `server/.env.example` to `server/.env`
   - Update database credentials
   - Set JWT secret

3. **Setup Database**
   - Create PostgreSQL database named `labsys`
   - Run `server/models/schema.sql`
   - (Optional) Run `server/models/sample_data.sql`

4. **Start Application**
   ```bash
   start-servers.bat
   ```

5. **Open Browser**
   - Automatically opens to http://localhost:5173
   - Login with your credentials

---

## 📋 Daily Workflow

### Starting Work:
```bash
start-servers.bat
```

### Stopping Work:
```bash
stop-servers.bat
```

Or simply close the terminal windows.

---

## 🔧 Troubleshooting

### "Node.js is not installed" Error
**Solution:** Install Node.js from https://nodejs.org/ (v16 or higher)

### Port Already in Use
**Solution:** 
1. Run `stop-servers.bat`
2. Wait a few seconds
3. Run `start-servers.bat` again

### Dependencies Not Found
**Solution:** Run `install.bat` again

### Backend Won't Start
**Check:**
- PostgreSQL is running
- `.env` file exists in server folder
- Database credentials are correct
- Port 5000 is not in use

### Frontend Won't Start
**Check:**
- Backend is running
- Port 5173 is not in use
- Dependencies are installed

---

## 💡 Tips

### Development Mode
- Both servers run in development mode with hot-reload
- Changes to code will automatically refresh
- Keep terminal windows open to see logs

### Viewing Logs
- Backend logs: Check "LabSys Backend" terminal window
- Frontend logs: Check "LabSys Frontend" terminal window

### Stopping Individual Servers
- Press `Ctrl+C` in the respective terminal window
- Or close the terminal window

### Running in Background
- The batch files open new terminal windows
- You can minimize them but don't close
- Closing the window stops the server

---

## 🚀 Advanced Usage

### Custom Ports
Edit the batch files if you need different ports:
- Backend: Change in `server/.env` (PORT variable)
- Frontend: Change in `client/vite.config.js`

### Production Build
For production deployment, see `DEPLOYMENT.md`

### Multiple Instances
To run multiple instances:
1. Change ports in configuration
2. Run batch files in separate directories

---

## 📞 Need Help?

- **Quick Start:** See `QUICK_START.md`
- **Full Documentation:** See `README.md`
- **API Reference:** See `API_DOCS.md`
- **Troubleshooting:** See `TROUBLESHOOTING.md`
- **Deployment:** See `DEPLOYMENT.md`

---

## ✅ Checklist

Before running for the first time:
- [ ] Node.js v16+ installed
- [ ] PostgreSQL v13+ installed and running
- [ ] Dependencies installed (`install.bat`)
- [ ] `.env` file configured
- [ ] Database created and schema loaded
- [ ] Sample data loaded (optional)

Ready to start:
- [ ] Run `start-servers.bat`
- [ ] Wait for both servers to start
- [ ] Browser opens automatically
- [ ] Login and enjoy!

---

## 🎉 Quick Commands Reference

| Action | Command |
|--------|---------|
| Install dependencies | `install.bat` |
| Start everything | `start-servers.bat` |
| Start backend only | `start-backend.bat` |
| Start frontend only | `start-frontend.bat` |
| Stop all servers | `stop-servers.bat` |

---

**Happy Coding! 🚀**

For detailed setup instructions, see `QUICK_START.md`
