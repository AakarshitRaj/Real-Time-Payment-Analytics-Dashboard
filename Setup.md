# 🚀 Quick Setup Guide

Get the payment analytics dashboard running in 5 minutes.

---

## Prerequisites

Install these first (one-time setup):

1. **Node.js 18+** → [Download](https://nodejs.org)
2. **Docker Desktop** → [Download](https://www.docker.com/products/docker-desktop)
3. **Git** (optional) → [Download](https://git-scm.com)

Verify installation:
```bash
node --version    # Should show v18.x.x or higher
docker --version  # Should show Docker version
```

---

## Installation Steps

### 1. Get the Code

```bash
# Clone or download the project
git clone <repository-url>
cd financeops-dashboard

# Or if you have the ZIP file:
unzip financeops-dashboard.zip
cd financeops-dashboard
```

### 2. Start MongoDB

```bash
docker run -d --name financeops-mongo -p 27017:27017 mongo:latest
```

**Check it's running:**
```bash
docker ps
# You should see: financeops-mongo
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Start the server
npm run start:dev
```

**You should see:**
```
🚀 Server running on http://localhost:3001
```

✅ **Keep this terminal open!**

### 4. Seed Database

**Open a NEW terminal:**

```bash
# Seed with sample data
curl -X POST http://localhost:3001/payments/seed

# Or open in browser:
# http://localhost:3001/payments/seed
```

**Expected output:**
```json
{"message": "Seeded successfully", "count": 1000}
```

### 5. Setup Frontend

**Open ANOTHER NEW terminal:**

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

**You should see:**
```
▲ Next.js 14.0.0
- Local: http://localhost:3000
```

### 6. Open Dashboard

🌐 **Open browser:** http://localhost:3000

You should see:
- ✅ 4 metric cards with payment stats
- ✅ 2 interactive charts
- ✅ Live events feed (new payments every 2 seconds)
- ✅ Green "LIVE" indicator

**🎉 Done! Your dashboard is running!**

---

## Quick Commands Reference

```bash
# Start MongoDB
docker run -d --name financeops-mongo -p 27017:27017 mongo:latest

# Start Backend (Terminal 1)
cd backend && npm run start:dev

# Seed Database (Terminal 2)
curl -X POST http://localhost:3001/payments/seed

# Start Frontend (Terminal 3)
cd frontend && npm run dev

# Open Browser
http://localhost:3000
```

---

## Stopping Everything

```bash
# Stop Backend & Frontend
# Press Ctrl+C in each terminal

# Stop MongoDB
docker stop financeops-mongo
```

---

## Restarting Later

```bash
# Start MongoDB (if stopped)
docker start financeops-mongo

# Start Backend
cd backend && npm run start:dev

# Start Frontend (new terminal)
cd frontend && npm run dev
```

**Note:** You don't need to seed again - data persists in MongoDB!

---

## Project URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend Dashboard | http://localhost:3000 | Main UI |
| Backend API | http://localhost:3001 | REST endpoints |
| WebSocket | ws://localhost:3001/ws/payments | Real-time events |
| Seed Endpoint | http://localhost:3001/payments/seed | Add sample data |

---

## Dependencies Installed

### Backend (`backend/package.json`)
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",           // NestJS core
    "@nestjs/mongoose": "^10.0.0",         // MongoDB integration
    "@nestjs/websockets": "^10.0.0",       // WebSocket support
    "@nestjs/platform-socket.io": "^10.0.0", // Socket.IO
    "mongoose": "^8.0.0",                  // MongoDB ODM
    "socket.io": "^4.6.0"                  // Real-time engine
  },
  "devDependencies": {
    "typescript": "^5.0.0",                // TypeScript compiler
    "ts-node-dev": "^2.0.0"                // Hot reload
  }
}
```

### Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "next": "^14.0.0",                     // Next.js framework
    "react": "^18.2.0",                    // React library
    "recharts": "^2.10.0",                 // Charts
    "lucide-react": "^0.263.1",            // Icons
    "socket.io-client": "^4.6.0"           // WebSocket client
  },
  "devDependencies": {
    "typescript": "^5.0.0",                // TypeScript
    "tailwindcss": "^3.4.0"                // CSS framework
  }
}
```

---

## Troubleshooting

### ❌ Port 3001 already in use

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### ❌ Port 3000 already in use

Change port in `frontend/package.json`:
```json
"dev": "next dev -p 3002"
```

### ❌ MongoDB connection failed

```bash
# Check if running
docker ps

# If not running, start it
docker start financeops-mongo

# If doesn't exist, create it
docker run -d --name financeops-mongo -p 27017:27017 mongo:latest
```

### ❌ Module not found errors

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
```

### ❌ Dashboard shows no data

```bash
# Reseed the database
curl -X POST http://localhost:3001/payments/seed
```

---

## Verify Everything Works

Run these checks:

```bash
# 1. MongoDB running?
docker ps
# Should show: financeops-mongo

# 2. Backend running?
curl http://localhost:3001/api/analytics/metrics
# Should return JSON with metrics

# 3. Can access frontend?
curl http://localhost:3000
# Should return HTML

# 4. Database has data?
curl http://localhost:3001/payments | head
# Should show payment records
```

All working? ✅ **You're good to go!**

---

## What's Running?

```
┌─────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                │
│  ↓ WebSocket + REST API                         │
│  Backend (http://localhost:3001)                │
│  ↓ MongoDB queries                              │
│  MongoDB Container (localhost:27017)            │
└─────────────────────────────────────────────────┘
```

---

## Next Steps

✅ Dashboard is running  
✅ Check the main **README.md** for detailed documentation  
✅ See **API Documentation** section for endpoints  
✅ See **Customization Guide** to modify features  

---

## Need Help?

**Common Issues:**
- Backend won't start → Check Node.js version (need 18+)
- Frontend errors → Delete `node_modules` and reinstall
- No data showing → Reseed the database
- MongoDB errors → Restart Docker container

**Still stuck?** Check the full README.md for detailed troubleshooting.

---

**Time to complete:** 5 minutes  
**Services running:** 3 (MongoDB, Backend, Frontend)  
**Ready to demo:** Yes! 🎉