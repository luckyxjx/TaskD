# TaskD Feature Roadmap (Phases 1-3)

**Goal**: Transform TaskD into a collaborative, gamified productivity platform
**Budget**: $0 (using Supabase free tier)
**Timeline**: 6-9 weeks (solo developer)

---

## 📊 Current State

### ✅ What We Have
- Authentication (Email, Google, GitHub)
- User profiles
- Workspaces (single-user)
- Boards with CRUD operations
- Lists (To Do, In Progress, Done)
- Cards with priority levels
- Drag & drop
- Real-time progress tracking
- Dark mode
- PWA ready

### 🎯 What We're Building
- Multi-user collaboration
- Real-time updates
- Activity tracking
- Comments & mentions
- Gamification
- Progress tracking
- Notifications
- Attachments

---

## 🚀 Phase 1: Collaborative Features (2-3 weeks)

### 1.1 Board Sharing & Invitations
**Time**: 3-4 days | **Priority**: CRITICAL

**Database Changes:**
```sql
-- Board members table
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  UNIQUE(board_id, user_id)
);

-- Board invitations table
CREATE TABLE board_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- [ ] Invite users by email
- [ ] Accept/decline invitations
- [ ] View board members
- [ ] Change member roles
- [ ] Remove members
- [ ] Leave board

**UI Components:**
- Share button on board header
- Members list modal
- Invite modal with email input
- Member avatars on board

---

### 1.2 Real-time Collaborative Updates
**Time**: 2-3 days | **Priority**: HIGH

**Implementation:**
- Use Supabase Realtime subscriptions
- Listen to card changes across all users
- Show "User X is editing" indicators
- Optimistic UI updates

**Features:**
- [ ] Real-time card updates
- [ ] Real-time list updates
- [ ] User presence indicators
- [ ] Conflict resolution

**Code Example:**
```typescript
// Subscribe to board changes
useEffect(() => {
  const subscription = supabase
    .channel(`board:${boardId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'cards',
      filter: `board_id=eq.${boardId}`
    }, (payload) => {
      // Update UI in real-time
    })
    .subscribe();
    
  return () => subscription.unsubscribe();
}, [boardId]);
```

---

### 1.3 Activity Log
**Time**: 2 days | **Priority**: MEDIUM

**Database Changes:**
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'moved', 'deleted', 'commented'
  entity_type TEXT NOT NULL, -- 'card', 'list', 'board'
  entity_id UUID NOT NULL,
  metadata JSONB, -- Store details like old/new values
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_board ON activities(board_id, created_at DESC);
```

**Features:**
- [ ] Track all board actions
- [ ] Activity feed on board
- [ ] Filter by user/action
- [ ] "Undo" for recent actions

**UI:**
- Activity sidebar/panel
- Timeline view
- User avatars + action descriptions

---

### 1.4 Comments on Cards
**Time**: 2-3 days | **Priority**: HIGH

**Database Changes:**
```sql
CREATE TABLE card_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  mentions UUID[], -- Array of mentioned user IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_card ON card_comments(card_id, created_at DESC);
```

**Features:**
- [ ] Add comments to cards
- [ ] Edit/delete own comments
- [ ] @mention users
- [ ] Real-time comment updates
- [ ] Comment count badge

**UI:**
- Comments section in card modal
- Comment input with @mention autocomplete
- User avatars + timestamps

---

## 🎮 Phase 2: Engagement Features (2-3 weeks)

### 2.1 Gamification System
**Time**: 4-5 days | **Priority**: HIGH

**Database Changes:**
```sql
-- User points and levels
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  cards_completed INTEGER DEFAULT 0,
  cards_created INTEGER DEFAULT 0,
  comments_made INTEGER DEFAULT 0
);

-- Badges/Achievements
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon name
  points_required INTEGER,
  condition JSONB -- Flexible conditions
);

CREATE TABLE user_badges (
  user_id UUID REFERENCES auth.users(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);
```

**Point System:**
- Create card: +5 points
- Complete card: +10 points
- Complete urgent card: +20 points
- Add comment: +2 points
- Daily streak: +5 points/day
- Invite user: +15 points

**Badges:**
- 🚀 "Getting Started" - Create first board
- 📋 "Organizer" - Create 10 cards
- ⭐ "Task Master" - Complete 50 cards
- 🔥 "On Fire" - 7-day streak
- 🤝 "Team Player" - Invite 5 users
- 💬 "Communicator" - 50 comments

**Features:**
- [ ] Points for actions
- [ ] Level progression
- [ ] Daily streaks
- [ ] Badge system
- [ ] Leaderboard per workspace
- [ ] Profile stats

**UI:**
- Points display in header
- Level badge on profile
- Badges showcase
- Leaderboard modal

---

### 2.2 Progress Tracking (Custom Fields)
**Time**: 3-4 days | **Priority**: MEDIUM

**Database Changes:**
```sql
CREATE TABLE card_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT CHECK (field_type IN ('text', 'number', 'date', 'checkbox', 'url')),
  field_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Use Cases:**
- Study hours tracking
- MOOC progress (0-100%)
- GitHub PR link
- Due dates
- Estimated time
- Actual time spent

**Features:**
- [ ] Add custom fields to cards
- [ ] Field templates (Study, Project, Sprint)
- [ ] Progress bars for percentage fields
- [ ] Time tracking
- [ ] URL fields (link to resources)

**UI:**
- Custom fields section in card modal
- Field type selector
- Progress visualization

---

### 2.3 Notifications System
**Time**: 3-4 days | **Priority**: MEDIUM

**Database Changes:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'mention', 'comment', 'assigned', 'invite', 'badge'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- Deep link to relevant page
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
```

**Notification Types:**
- @mentioned in comment
- Assigned to card
- Card moved to "Done"
- Board invitation
- New badge earned
- Daily streak reminder

**Features:**
- [ ] In-app notification center
- [ ] Unread count badge
- [ ] Mark as read
- [ ] Notification preferences
- [ ] Push notifications (PWA)

**UI:**
- Bell icon in header with count
- Notification dropdown
- Settings for notification preferences

---

### 2.4 User Mentions
**Time**: 2 days | **Priority**: MEDIUM

**Features:**
- [ ] @mention autocomplete in comments
- [ ] Highlight mentioned users
- [ ] Notify mentioned users
- [ ] Show mentions in activity log

**Implementation:**
- Use regex to detect @username
- Autocomplete dropdown with board members
- Store mentions in comments table

---

### 2.5 Due Dates & Reminders
**Time**: 2-3 days | **Priority**: MEDIUM

**Database Changes:**
```sql
ALTER TABLE cards ADD COLUMN due_date TIMESTAMP;
ALTER TABLE cards ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
```

**Features:**
- [ ] Set due dates on cards
- [ ] Visual indicators (overdue = red)
- [ ] Sort/filter by due date
- [ ] Daily reminder notifications
- [ ] Calendar view (optional)

**UI:**
- Date picker in card modal
- Due date badge on card
- Overdue indicator

---

## 🎨 Phase 3: Polish & Growth (2-3 weeks)

### 3.1 File Attachments
**Time**: 3-4 days | **Priority**: MEDIUM

**Database Changes:**
```sql
CREATE TABLE card_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Supabase Storage:**
- Bucket: `card-attachments`
- Max file size: 5MB (free tier friendly)
- Allowed types: images, PDFs, docs

**Features:**
- [ ] Upload files to cards
- [ ] Preview images inline
- [ ] Download attachments
- [ ] Delete attachments
- [ ] File size limits

**UI:**
- Drag & drop upload
- Attachment list in card modal
- Thumbnail previews

---

### 3.2 Templates
**Time**: 2-3 days | **Priority**: LOW

**Database Changes:**
```sql
CREATE TABLE board_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'study', 'project', 'sprint', 'personal'
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  template_data JSONB, -- Board structure
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Templates:**
- 📚 Study Tracker (To Learn, Learning, Mastered)
- 💻 Project Board (Backlog, In Progress, Review, Done)
- 🏃 Sprint Board (Sprint Backlog, In Progress, Testing, Done)
- 📝 Personal Tasks (Today, This Week, Later, Done)

**Features:**
- [ ] Create board from template
- [ ] Save board as template
- [ ] Public template gallery
- [ ] Custom templates

---

### 3.3 Export & Backup
**Time**: 2 days | **Priority**: LOW

**Features:**
- [ ] Export board as JSON
- [ ] Export board as CSV
- [ ] Export board as Markdown
- [ ] Import from JSON
- [ ] Backup all workspaces

**UI:**
- Export button in board settings
- Format selector
- Download file

---

### 3.4 Public Boards
**Time**: 2-3 days | **Priority**: LOW

**Database Changes:**
```sql
ALTER TABLE boards ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE boards ADD COLUMN public_token TEXT UNIQUE;
```

**Features:**
- [ ] Make board public
- [ ] Generate shareable link
- [ ] View-only public access
- [ ] Public board gallery
- [ ] Embed boards (iframe)

**Use Cases:**
- Share study progress publicly
- Portfolio projects
- Open-source project boards

---

### 3.5 Search & Filters
**Time**: 2-3 days | **Priority**: MEDIUM

**Features:**
- [ ] Search cards by title/description
- [ ] Filter by priority
- [ ] Filter by assignee
- [ ] Filter by due date
- [ ] Filter by custom fields
- [ ] Saved filters

**UI:**
- Search bar in board header
- Filter dropdown
- Active filters chips

---

### 3.6 Keyboard Shortcuts
**Time**: 1-2 days | **Priority**: LOW

**Shortcuts:**
- `N` - New card
- `B` - New board
- `/` - Focus search
- `Esc` - Close modal
- `Ctrl+Enter` - Save card
- `?` - Show shortcuts

**UI:**
- Shortcuts help modal
- Keyboard icon in header

---

## 📈 Success Metrics

### User Engagement
- Daily active users (DAU)
- Cards created per user
- Comments per board
- Average session time
- Retention rate (7-day, 30-day)

### Collaboration
- Boards with >1 member
- Comments per card
- Invitations sent/accepted
- Real-time concurrent users

### Gamification
- Users with streaks >7 days
- Badges earned
- Average points per user
- Leaderboard participation

---

## 🎯 Launch Strategy

### Soft Launch (After Phase 1)
1. Share with friends/family
2. Get feedback on collaboration features
3. Fix critical bugs
4. Iterate on UX

### Public Launch (After Phase 2)
1. Post on Reddit (r/productivity, r/SideProject)
2. Post on ProductHunt
3. Share on Twitter/LinkedIn
4. Create demo video
5. Write blog post

### Growth (After Phase 3)
1. SEO optimization
2. Content marketing (productivity tips)
3. Integration with other tools
4. Community building (Discord/Slack)

---

## 💡 Pro Tips

### Development
- Build features incrementally
- Ship fast, iterate faster
- Use feature flags for testing
- Write tests for critical paths

### Database
- Use Supabase RLS for security
- Index frequently queried columns
- Monitor database size (500MB limit)
- Archive old data if needed

### Performance
- Lazy load components
- Optimize images
- Use React.memo for expensive components
- Debounce search/filters

### User Feedback
- Add feedback button
- Monitor error logs (Sentry free tier)
- Track analytics (Plausible/Umami - self-hosted)
- Regular user surveys

---

## 🚨 Risks & Mitigation

### Risk 1: Supabase Free Tier Limits
**Mitigation:**
- Monitor usage monthly
- Optimize queries
- Add pagination
- Archive old data
- Upgrade when needed ($25/month)

### Risk 2: Slow Development (Solo)
**Mitigation:**
- Focus on MVP features first
- Use AI tools (GitHub Copilot)
- Reuse components
- Don't over-engineer

### Risk 3: User Acquisition
**Mitigation:**
- Build in public (Twitter/LinkedIn)
- Solve real problems
- Great UX > More features
- Word of mouth

### Risk 4: Maintenance Burden
**Mitigation:**
- Write clean code
- Document everything
- Automate testing
- Use TypeScript (catch bugs early)

---

## 🎉 You Got This!

This roadmap is ambitious but totally doable. Focus on one phase at a time, ship early, get feedback, and iterate. 

**Remember:**
- Perfect is the enemy of done
- Users care about solving their problems, not perfect code
- Ship fast, learn faster
- Celebrate small wins

Ready to start with Phase 1? Let's build board sharing first! 🚀
