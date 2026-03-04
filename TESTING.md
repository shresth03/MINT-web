# SIGINT — Testing Document

## Test Environments
- Local: http://localhost:5173
- Production: https://signit-app.vercel.app

## Test Accounts
| Email | Role | Purpose |
|-------|------|---------|
| shresthgpj@gmail.com | admin | Admin testing |
| epoonawala@gmail.com | admin | Secondary admin |
| [new signup] | public | Public user testing |

---

## 1. Authentication Tests

### 1.1 Register
- [ ] Navigate to /register
- [ ] Fill in username, email, password
- [ ] Submit → redirects to /feed
- [ ] Check Supabase users table → new row created automatically
- [ ] Check role = 'public'

### 1.2 Login
- [ ] Navigate to /login
- [ ] Enter valid credentials → redirects to /feed
- [ ] Enter wrong password → shows error message
- [ ] Enter unregistered email → shows error message

### 1.3 Protected Routes
- [ ] Log out → try visiting /feed → redirects to /login
- [ ] Try visiting /admin without admin role → redirects to /feed
- [ ] Try visiting /profile while logged out → redirects to /login

### 1.4 Sign Out
- [ ] Click ⊗ SIGN OUT in sidebar
- [ ] Redirects to /login
- [ ] Cannot access /feed without logging in again

---

## 2. Intel Feed Tests

### 2.1 Story List
- [ ] Stories load from Supabase (not mock data)
- [ ] Breaking stories show BREAKING tag with animation
- [ ] Story tags display correctly (CONFLICT, CYBER, etc.)
- [ ] Source chips show ◆ for verified OSINT channels
- [ ] Source count shows warning color for single source stories

### 2.2 Story Detail
- [ ] Click a story → detail panel opens on right
- [ ] Headline displays correctly
- [ ] Confidence bar fills to correct percentage
- [ ] Timeline bar shows sources in order
- [ ] AI Summary section displays
- [ ] Source cards show username, score, post body
- [ ] VIEW ON MAP button → navigates to map and highlights region

### 2.3 Loading State
- [ ] Skeleton loaders appear while stories are fetching
- [ ] Skeletons disappear once data loads

---

## 3. General Feed Tests

### 3.1 View Posts
- [ ] Posts load from Supabase
- [ ] Username displays correctly (not "Unknown")
- [ ] Timestamp shows relative time (e.g. "2m ago")

### 3.2 Create Post
- [ ] Type in composer → character count updates (x/500)
- [ ] POST button disabled when empty
- [ ] Submit post → appears in feed immediately
- [ ] Post saved to Supabase posts table
- [ ] POST button shows "POSTING..." while saving

### 3.3 Like Posts
- [ ] Click ♡ → like count increments
- [ ] Like count persists after page refresh
- [ ] Like count updates in Supabase

### 3.4 Realtime
- [ ] Open two browser tabs
- [ ] Post in one tab → appears in other tab without refresh

---

## 4. Event Map Tests

### 4.1 Map Load
- [ ] World map renders correctly
- [ ] Region bubbles appear with correct sizes
- [ ] Breaking regions show pulse animation (orange)
- [ ] Active regions show yellow
- [ ] Monitoring regions show blue

### 4.2 Filters
- [ ] Click ALL → shows all regions
- [ ] Click CONFLICT → shows only conflict regions
- [ ] Click CYBER → shows only cyber regions
- [ ] Active filter button highlighted

### 4.3 Region Interaction
- [ ] Hover over bubble → tooltip shows region name and count
- [ ] Click bubble → region detail popup appears
- [ ] Popup shows event count, categories, linked stories
- [ ] Click linked story → navigates to feed with story selected
- [ ] Click × → closes popup

### 4.4 Stats Panel
- [ ] Total Events count correct
- [ ] Breaking Zones count correct
- [ ] Hottest Region shows correct region name

---

## 5. OSINT Application Tests

### 5.1 Submit Application
- [ ] Click Apply to Join in sidebar
- [ ] Modal opens with evaluation criteria
- [ ] Fill Channel Name and Handle (required)
- [ ] Submit → success screen shows
- [ ] Application saved to osint_applications table
- [ ] Apply to Join hidden for osint/admin users

### 5.2 Admin Review
- [ ] Login as admin
- [ ] Navigate to /admin
- [ ] Stats cards show correct counts
- [ ] Pending applications listed
- [ ] Click APPROVE → status changes to approved
- [ ] Approved user's role updates to 'osint' in users table
- [ ] Click REJECT → status changes to rejected
- [ ] Reviewed section shows approved/rejected with badges

---

## 6. Profile Page Tests

### 6.1 View Profile
- [ ] Navigate to /profile
- [ ] Username displays correctly
- [ ] Email displays (disabled)
- [ ] Role badge shows correct role
- [ ] Post count shows correct number
- [ ] Score displays

### 6.2 Edit Profile
- [ ] Change username → click SAVE CHANGES
- [ ] Success message appears
- [ ] Leave page and return → new username persists
- [ ] Username updates in Supabase users table

### 6.3 Verified Channel Banner
- [ ] Login as osint user → green VERIFIED OSINT CHANNEL banner shows
- [ ] Public user → no banner shown

---

## 7. Role-Based Access Tests

| Feature | Public | OSINT | Admin |
|---------|--------|-------|-------|
| View Intel Feed | ✅ | ✅ | ✅ |
| View General Feed | ✅ | ✅ | ✅ |
| Post in General Feed | ✅ | ✅ | ✅ |
| Post Intel Stories | ❌ | ✅ | ✅ |
| Apply to Join | ✅ | ❌ | ❌ |
| Admin Dashboard | ❌ | ❌ | ✅ |
| Approve Applications | ❌ | ❌ | ✅ |

---

## 8. Navigation Tests

### 8.1 Sidebar
- [ ] Intel Feed → shows feed layout
- [ ] Trending → shows trending stories ranked by sources
- [ ] Event Map → shows D3 world map
- [ ] Verified Sources → shows channel list
- [ ] My Profile → navigates to /profile
- [ ] Admin Dashboard → navigates to /admin (admin only)
- [ ] Apply to Join → opens modal (public only)

### 8.2 Routes
- [ ] / → redirects to /feed
- [ ] /feed → Intel Feed
- [ ] /login → Login page
- [ ] /register → Register page
- [ ] /profile → Profile page
- [ ] /admin → Admin dashboard (admin only)
- [ ] /random → 404 page (if configured)

---

## 9. Error & Edge Case Tests

### 9.1 Empty States
- [ ] No stories → falls back to mock data
- [ ] No general posts → shows "No posts yet. Be the first!"
- [ ] No pending applications → shows "No pending applications"
- [ ] Region with no linked stories → shows appropriate message

### 9.2 Error Boundary
- [ ] Trigger a JS error → error boundary catches it
- [ ] RETURN TO FEED button → navigates back to /feed

### 9.3 Form Validation
- [ ] Post over 500 chars → error message shown
- [ ] Apply without Channel Name → button stays disabled
- [ ] Login with empty fields → error shown

---

## 10. Performance & Production Tests

### 10.1 Vercel Deploy
- [ ] Push to main → Vercel auto-deploys
- [ ] Production URL loads correctly
- [ ] Supabase env vars working in production
- [ ] Auth redirects working on production URL

### 10.2 Browser Compatibility
- [ ] Chrome → all features work
- [ ] Safari → all features work
- [ ] Firefox → all features work

### 10.3 Console
- [ ] No red errors in console
- [ ] No debug console.log statements remaining

---

## Known Limitations
- Mobile not optimized (desktop only)
- Intel Stories can only be posted via direct DB insert (no UI yet)
- Trending page uses mock ranking (no real view counts yet)
- Verified Sources page uses mock channel data

---

## Sign-off Checklist
- [ ] All critical tests passing
- [ ] No console errors
- [ ] Production deploy working
- [ ] README updated
- [ ] Git history clean
