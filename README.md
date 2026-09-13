# 🎮 GAMERZHUB

> Connect. Compete. Level Up.

GAMERZHUB is an all-in-one social networking platform built exclusively for gamers. It combines networking, tournaments, recruitment, AI-powered recommendations, communities, messaging, analytics, and esports career opportunities into one modern ecosystem.

---

# 🌟 Vision

To become the world's #1 professional networking platform for gamers, esports players, creators, coaches, recruiters, and gaming organizations.

---

# 🚀 Features

## 👤 Gamer Profile
- Custom gamer profile
- Gaming statistics
- Rank & achievements
- Portfolio
- Gaming resume

## 👥 Social Network
- Follow players
- Friends system
- Activity feed
- Messaging
- Voice chat
- Communities & Clans

## 🏆 Competitive Gaming
- Tournament Hosting
- Live Tournament Tracking
- Matchmaking
- Team Finder
- Team Dashboard
- Scrim Finder

## 📊 Analytics
- Performance statistics
- XP System
- Achievement Badges
- AI Highlights
- Gaming Resume

## 🤖 AI Features
- AI Career Coach
- Smart teammate recommendations
- Performance analysis
- Coaching suggestions

## 💼 Career
- Recruiter Dashboard
- Verified Players
- Gaming Jobs
- Portfolio
- Resume Builder

## 🛍 Marketplace
- Digital Products
- Gaming Accounts
- Merchandise
- Coaching Services

## 📺 Media
- Live Streaming
- Gaming News
- Event Calendar
- Learning Center

---

# 🛠 Technology Stack

## Frontend
- Next.js
- TypeScript
- Tailwind CSS

## Environment Setup
- Copy [.env.example](.env.example) to .env and fill in the real values for your local backend environment.
- Copy [web/.env.example](web/.env.example) to web/.env.local and set the frontend API and socket URLs.
- Keep all secrets in those environment files and never commit them to Git.
- For Supabase auth/database, set the SUPABASE_* values plus the database URL in the server env file.

## Backend
- Node.js
- Express.js

## Database
- PostgreSQL

## Authentication
- Google OAuth
- Discord OAuth
- Steam Login

## Cloud
- Cloudinary
- Socket.IO
- Vercel
- Railway

Future Cloud:
- AWS

---

# 📅 Development Roadmap

## Phase 1
- Landing Page
- Authentication
- Gamer Profiles
- Feed
- Messaging

## Phase 2
- Teams
- Matchmaking
- Statistics
- Notifications

## Phase 3
- AI Features
- Recruitment
- Tournament System
- Premium Membership

## Phase 4
- Android App
- iOS App
- Global Expansion

---

# 🎯 Why GAMERZHUB?

Unlike Discord, Steam, Faceit, Tracker.gg, Battlefy, Guilded, and Challengermode, GAMERZHUB combines everything gamers need into one platform.

✅ Social Networking

✅ Tournaments

✅ AI Assistance

✅ Career Opportunities

✅ Coaching

✅ Marketplace

✅ Team Recruitment

✅ Cross-game Profiles

---

# 💰 Monetization

- Premium Subscription
- Tournament Entry Fees
- Marketplace Commission
- Advertisements
- Coaching
- Recruiter Tools

---

# 📱 Future Plans

- Android App
- iOS App
- AI Coach
- AI Matchmaking
- Esports Academy
- International Expansion
- Premium Feature

# 🏗 System Architecture

```
Flutter App
      │
 REST API (FastAPI)
      │
────────────────────────
Authentication Service
User/Profile Service
Feed Service
Friends Service
Chat Service
Teams Service
Tournament Service
Matchmaking Service
Game Library Service
Achievements Service
Notification Service
Marketplace Service
Resume Service
Recruitment Service
AI Service
Admin Panel Service
Analytics Service
────────────────────────
PostgreSQL
Supabase Storage
Firebase Cloud Messaging
```

---

# 📦 Core Modules

## 🔐 Authentication
- Register
- Login
- Logout
- Refresh Token
- Forgot Password
- Reset Password
- Change Password
- Email Verification
- Phone OTP
- Google Login
- Discord Login
- Steam Login
- Riot Login
- Epic Games Login
- JWT Authentication
- Device Management
- Session Management
- Two Factor Authentication (2FA)

---

## 👤 Gamer Profile

### Profile Includes
- Username
- Display Name
- Bio
- Avatar
- Cover Photo
- Country & State
- Language
- Birthday
- Favorite Games
- Rank
- Skill Level
- Competitive Role
- Gaming Devices
- Social Links
- Discord
- Twitch
- YouTube
- Kick
- Instagram
- Steam ID
- Riot ID
- Epic ID
- Achievements
- XP & Level
- Followers
- Following
- Friends
- Verified Badge

### Features
- Edit Profile
- Privacy Settings
- Block User
- Report User
- Verification Request

---

## 📰 Feed
- Create Post
- Image & Video Posts
- Polls
- Gaming Clips
- Reposts
- Likes
- Comments
- Replies
- Shares
- Saved Posts
- Pin Posts
- Trending Feed
- Following Feed
- Discover Feed

---

## 👥 Friends
- Friend Requests
- Accept / Reject
- Cancel Request
- Remove Friend
- Follow / Unfollow
- Suggested Players
- Mutual Friends

---

## 💬 Chat
- Private Chat
- Group Chat
- Clan Chat
- Team Chat
- Tournament Chat
- Voice Call
- Video Call
- Typing Indicator
- Read Receipts
- Delivered Status
- Delete/Edit Messages
- Pin Messages
- Image, Video & File Sharing
- Emoji & GIF Support
- Reply & Forward

---

## 🎮 Game Library
- Add / Remove Games
- Favorite Games
- Recently Played
- Game Statistics
- Steam Sync
- Riot Sync
- Epic Games Sync

---

## 🏆 Tournament
- Create Tournament
- Join / Leave Tournament
- Brackets
- Match Schedule
- Match Results
- Team Registration
- Solo Registration
- Prize Pool
- Live Scores
- Winners

---

## 🤝 Teams
- Create Team
- Join / Leave Team
- Invite Players
- Kick Players
- Team Roles
- Captain System
- Team Statistics
- Logo & Banner

---

## 🔍 Matchmaking
- Filter by Game
- Rank
- Region
- Role
- Language
- Availability
- Find Players
- Find Teams
- AI Recommendations

---

## 🏅 Achievements
- XP System
- Levels
- Daily Missions
- Weekly Missions
- Seasonal Missions
- Badges
- Medals
- Streaks

---

## 📊 Statistics
- Wins
- Losses
- KDA
- Accuracy
- Hours Played
- MVP Count
- Rank History
- Leaderboards
- Match History

---

## 💼 Gaming Resume
- Upload Resume
- Gaming Experience
- Tournament History
- Team History
- Coaching Experience
- Skills
- Languages
- Devices
- Internet Speed
- Download PDF Resume

---

## 💼 Recruitment
Organizations can:
- Post Jobs
- Invite Players
- Hire Coaches
- Hire Analysts
- Hire Managers
- Review Applications

Players can:
- Apply
- Upload Resume
- Portfolio

---

## 🛒 Marketplace
- Buy Products
- Sell Digital Products
- Merchandise Store
- Wishlist
- Orders
- Ratings
- Reviews
- Coupons

---

## 🎥 Live Streaming
- Start Stream
- Watch Streams
- Follow Streamers
- Live Chat
- Donations
- Clips

---

## 🤖 AI Features
- AI Team Finder
- AI Match Analysis
- AI Coaching
- AI Career Advice
- AI Performance Reports
- AI Highlight Detection
- AI Resume Review

---

## 🔔 Notifications
- Friend Requests
- Messages
- Likes
- Comments
- Tournament Updates
- Team Invites
- Recruitment Alerts
- Marketplace Alerts
- Achievement Unlocks
- Push Notifications (FCM)
- Scheduled Notifications

---

## ⚙️ Admin Panel
- Dashboard
- User Management
- Tournament Management
- Team Management
- Reports
- Ban/Suspend Users
- Delete Content
- Revenue Dashboard
- Verification Requests

---

## 📈 Analytics
- Daily Active Users
- Monthly Active Users
- Retention Rate
- New Users
- Tournament Statistics
- Marketplace Revenue
- Top Games
- Top Teams
- Top Players

---

# 🗄 Database Tables

```
users
profiles
games
user_games
posts
comments
likes
shares
follows
friends
chats
messages
teams
team_members
tournaments
tournament_matches
matchmaking_requests
achievements
xp_logs
notifications
resumes
recruitments
job_posts
applications
marketplace_products
orders
reviews
reports
admin_logs
analytics_events
```

---

# 🚀 Project Status

**Current Status:** 🚧 Active Development

- ✅ System Architecture Designed
- ✅ UI/UX Planning Completed
- ✅ Feature Roadmap Defined
- 🚧 Backend Development In Progress
- ⏳ Mobile Application Development
- ⏳ Public Beta (Planned)

---

## 👨‍💻 Contributors

- **Om Harde** (@omharde42) — Founder And CEO of B2CSolution company
- and Co-Founder of Gamerzhub
- **Yash** (@YASH544847) — Founder of Gamerzhub
- **Purvesh Bhadale** — Co-Founder B2CSolution Company & Collaborator of Gamerzhub

  ---

## 🤝 Contributing

We appreciate every contribution to GamerzHub.

### Development Workflow

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/my-feature
```

3. Install dependencies.

```bash
npm install
```

4. Start development.

```bash
npm run dev
```

5. Run lint checks.

```bash
npm run lint
```

6. Ensure TypeScript passes.

```bash
npm run type-check
```

7. Commit using Conventional Commits.

Example:

```text
feat:
fix:
docs:
style:
refactor:
perf:
test:
build:
ci:
```

Example:

```bash
git commit -m "fix(auth): resolve Google OAuth callback"
```

8. Push your branch.

```bash
git push origin feature/my-feature
```

9. Open a Pull Request.

### Pull Request Checklist

- [ ] Code builds successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Tested locally
- [ ] Screenshots attached (if UI changes)
- [ ] Documentation updated

### Reporting Bugs

Please include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Screenshots
- Browser/OS information

---

Thank you for making GamerHub better for everyone! 🚀
  
