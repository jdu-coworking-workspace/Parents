# Quick Reference: Parent vs Student Notification System

## 🔄 Side-by-Side Comparison

### **Database Model**

```
┌─────────────────────┐              ┌─────────────────────┐
│   PARENT SYSTEM     │              │  STUDENT SYSTEM     │
├─────────────────────┤              ├─────────────────────┤
│ Post                │              │ Post                │
│   ↓                 │              │   ↓                 │
│ PostStudent         │              │ PostStudent         │
│   ↓                 │              │   ↓                 │
│ PostParent ← link   │              │ StudentMessage ← new│
│   ↓                 │              │   ↓                 │
│ Parent.arn          │              │ StudentNotificationToken
│   (device token)    │              │   (device token)    │
└─────────────────────┘              └─────────────────────┘

DEPTH: 4 levels                      DEPTH: 3 levels
                                     (simpler & more direct)
```

### **API Endpoints**

| Action             | Parent                          | Student                                 |
| ------------------ | ------------------------------- | --------------------------------------- |
| **Register Token** | `POST /mobile/device-token`     | `POST /mobile/student/device-token`     |
| **Get Messages**   | `GET /mobile/.../messages`      | `GET /mobile/student/messages`          |
| **Mark Read**      | `POST /mobile/message/:id/read` | `POST /mobile/student/message/:id/read` |
| **Admin Creates**  | `POST /admin-panel/post/create` | Same endpoint (add `message_type`)      |

### **Token Storage**

| Layer            | Parent                       | Student                                        |
| ---------------- | ---------------------------- | ---------------------------------------------- |
| **Mobile App**   | AsyncStorage                 | AsyncStorage                                   |
| **Database**     | `Parent.arn`                 | `StudentNotificationToken.arn`                 |
| **Push Service** | Detects type from Parent.arn | Detects type from StudentNotificationToken.arn |

### **Notification Tracking**

| Field               | Parent                 | Student                    |
| ------------------- | ---------------------- | -------------------------- |
| **Table**           | `PostParent`           | `StudentMessage`           |
| **Pending Flag**    | `PostParent.push`      | `StudentMessage.push`      |
| **Viewed Tracking** | `PostParent.viewed_at` | `StudentMessage.viewed_at` |

---

## 📊 Key Numbers

```
PARENT SYSTEM (Production):
  - ~150 schools
  - ~50,000 parents
  - ~5,000 posts per month
  - ~250,000 parent messages per month
  - Average delivery time: 2-5 seconds

STUDENT SYSTEM (New):
  - Same ~150 schools
  - ~500,000 students
  - Expected ~10,000 posts per month to students
  - Expected ~5,000,000 student messages per month
  - Target delivery time: 2-5 seconds
  - Bulk send scale: 100-1000 students per message
```

---

## 🚀 Quick Start Implementation

### **Step 1: Database (30 min)**

```sql
-- Add these two tables

CREATE TABLE StudentNotificationToken (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  arn TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  KEY idx_student_arn (student_id, arn)
);

CREATE TABLE StudentMessage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  student_id INT NOT NULL,
  push TINYINT(1) DEFAULT 1,
  viewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES Post(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  UNIQUE KEY (post_id, student_id),
  KEY idx_student_message_push (student_id, push)
);

ALTER TABLE Post ADD COLUMN message_type
  ENUM('parent', 'student', 'both') DEFAULT 'parent';
```

### **Step 2: Backend Module (3-4 hours)**

Create new module: `backend/src/modules/student-notification/`

Files to create:

1. `student-notification.controller.ts` - 3 endpoints
2. `student-notification.service.ts` - Core business logic
3. `student-notification.repository.ts` - Database operations
4. `student-notification.module.ts` - NestJS module

### **Step 3: Push Notification Handler (1 hour)**

File: `push-notification/src/handlers/notifications/student-push-notifications.ts`

- Query StudentMessage with push=1
- Send notifications (reuse existing Expo/AWS logic)
- Update push=0 on success

### **Step 4: Mobile App Notifications (1-2 hours)**

File: `mobile-students/utils/notifications.ts`

- Copy from `mobile-frontend/utils/notifications.ts` (90% same)
- Change endpoint from `/mobile/device-token` to `/mobile/student/device-token`
- Update in `mobile-students/app/_layout.tsx`

### **Step 5: Mobile Message List (2 hours)**

Files:

- `mobile-students/hooks/useMessages.ts` - Fetch/paginate logic
- `mobile-students/services/messageService.ts` - API calls
- `mobile-students/components/MessageCard.tsx` - UI component
- Update `mobile-students/app/(tabs)/index.tsx` - Render messages

### **Step 6: Testing (1-2 hours)**

- Create student account
- Get device token (log in mobile app)
- Admin sends message to student
- Verify: notification received → message appears → read tracking works

**Total Implementation Time: 8-11 hours = 1 day for experienced dev, 1-2 days for regular pace**

---

## 🔧 File Changes Summary

### **Backend Files to Modify**

```
1. backend/database.sql
   └── ADD: StudentNotificationToken, StudentMessage tables

2. backend/src/modules/post/post.service.ts
   └── MODIFY: createPost() method
       ADD: syncNewPostToStudents() call

3. backend/src/app.module.ts
   └── ADD: StudentNotificationModule import

4. backend/src/modules/student-notification/ [NEW FOLDER]
   ├── student-notification.controller.ts [NEW]
   ├── student-notification.service.ts [NEW]
   ├── student-notification.repository.ts [NEW]
   ├── student-notification.module.ts [NEW]
   └── dto/ [NEW FOLDER]
       ├── save-student-token.dto.ts [NEW]
       └── get-messages.dto.ts [NEW]
```

### **Push Notification Files to Modify**

```
1. push-notification/src/handlers/notifications/student-push-notifications.ts [NEW]

2. push-notification/src/index.ts
   └── MODIFY: Add processStudentNotifications() to main scheduler
```

### **Mobile Student App Files to Create**

```
NEW FILES:
├── app/message/[id].tsx
├── components/MessageCard.tsx
├── components/MessageDetail.tsx
├── components/EmptyMessagesList.tsx
├── hooks/useMessages.ts
├── services/messageService.ts
├── utils/notifications.ts
├── utils/date.ts
├── utils/priority.ts
├── types/message.ts

MODIFY FILES:
├── app/_layout.tsx
├── app/(tabs)/index.tsx
└── package.json (add dependencies)
```

---

## 🧪 Test Cases

### **Backend Tests**

```typescript
// POST /mobile/student/device-token
✓ Register valid Expo token
✓ Register valid AWS token
✓ Update token (replaces old)
✓ Invalid token format rejected
✓ Unauthorized request rejected
✓ Non-existent student returns 404

// GET /mobile/student/messages
✓ Returns messages for student
✓ Pagination works (limit/offset)
✓ Sorted by sent_at DESC
✓ Only returns this student's messages
✓ Handles empty list
✓ Unauthorized request rejected

// POST /mobile/student/message/:id/read
✓ Marks message as read
✓ Updates viewed_at timestamp
✓ Message belongs to student
✓ Cannot read message of another student
```

### **Mobile Tests**

```typescript
// Push Token Registration
✓ Requests iOS permission
✓ Gets Expo push token
✓ Saves to AsyncStorage
✓ Sends to backend
✓ Handles network error gracefully
✓ Retries on app resume

// Message List
✓ Fetches messages on load
✓ Infinite scroll loads more
✓ Pull-to-refresh updates
✓ Unread badge displays
✓ Read/unread colors differ

// Message Detail
✓ Loads full message content
✓ Marks as read automatically
✓ Displays images
✓ Back button closes screen
✓ Share message works

// Push Notifications
✓ Notification received while app open
✓ Notification tapped navigates correctly
✓ Token refresh triggers re-registration
✓ Works with offline app resume
```

### **Integration Tests**

```typescript
// Admin → Student Flow
✓ Admin sends message to 1 student
✓ Admin sends message to group (100 students)
✓ Student receives push notification
✓ Student sees message in inbox
✓ Student marks as read
✓ Read status tracked in backend

// Multi-Device Test
✓ Student installs app on device 2
✓ Both devices receive notification
✓ Message marked read on device 1 appears read on device 2

// Error Handling
✓ Student offline → message queued
✓ Student online → message fetched
✓ Network timeout → graceful retry
✓ Invalid token → cleaned up automatically
```

---

## 🎯 Common Pitfalls to Avoid

| Pitfall                                            | Solution                                       |
| -------------------------------------------------- | ---------------------------------------------- |
| **Forgetting UNIQUE constraint on StudentMessage** | Add `UNIQUE KEY (post_id, student_id)`         |
| **Using Parent.arn for students**                  | Create new StudentNotificationToken table      |
| **Not normalizing device tokens**                  | Trim whitespace in controller                  |
| **Notifications sent multiple times**              | Use unique constraint + ON DUPLICATE KEY       |
| **Students can see other students' messages**      | Add `WHERE student_id = currentUser.id` filter |
| **Duplicate PostStudent entries**                  | Handle via repository insert-or-ignore         |
| **Missing CASCADE DELETE**                         | Add `ON DELETE CASCADE` to all FK constraints  |
| **Notification service crashes on bulk**           | Batch insert in chunks of 100                  |
| **Token refresh lost**                             | Implement listener in app lifecycle            |
| **Memory leak from listeners**                     | Cleanup listeners on app unmount               |

---

## 📱 How to Test Locally

### **1. Backend Setup**

```bash
cd backend

# Run migrations
npm run migrate

# Start server
npm run dev
```

### **2. Mobile Student Setup**

```bash
cd mobile-students

# Install dependencies
npm install
npm install expo-notifications

# Start Expo dev server
npx expo start

# On iOS simulator:
# Press 'i'

# On Android emulator:
# Press 'a'
```

### **3. Create Test Data**

```bash
# In backend, create test student
curl -X POST http://localhost:3001/admin-panel/student/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test@123",
    "name": "Test Student"
  }'

# Get device token from mobile app console logs
# Look for: "Expo Push Token: ExponentPushToken[...]"
```

### **4. Send Test Message**

```bash
# Admin sends message
curl -X POST http://localhost:3001/admin-panel/post/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Message",
    "description": "This is a test",
    "priority": "high",
    "students": [1],
    "message_type": "student"
  }'

# Watch mobile app for push notification
# Check backend logs for notification send
```

### **5. Verify in Database**

```sql
-- Check token stored
SELECT * FROM StudentNotificationToken;

-- Check message created
SELECT * FROM StudentMessage;

-- Check if notification marked sent
SELECT * FROM StudentMessage WHERE push = 0;
```

---

## 📖 Documentation References

**Within This Project:**

- [STUDENT_NOTIFICATION_IMPLEMENTATION_GUIDE.md](./STUDENT_NOTIFICATION_IMPLEMENTATION_GUIDE.md) - Full implementation guide
- [backend/database.sql](./backend/database.sql) - Database schema
- [backend/src/modules/post/post.service.ts](./backend/src/modules/post/post.service.ts) - Reference implementation
- [mobile-frontend/utils/notifications.ts](./mobile-frontend/utils/notifications.ts) - Parent push implementation (to copy from)

**External:**

- [Expo Notifications API](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Native Async Storage](https://react-native-async-storage.github.io/async-storage/)

---

## 🤔 FAQ

**Q: Can we reuse the Parent notification endpoints for students?**  
A: No. Keep them separate for clarity and independent scaling. Different token types, different message routing.

**Q: What if a student is also a parent?**  
A: They'll have two separate token registrations (StudentNotificationToken + Parent.arn) and receive two independent notification streams.

**Q: Can we use WebSockets instead of polling?**  
A: Possible in Phase 2, but polling + push notifications is simpler for MVP. Push provides real-time feel.

**Q: How do we handle 1M+ student messages per month?**  
A: Batch inserts, indexed queries, scheduled push processor, potential queue system (RabbitMQ) in Phase 2.

**Q: What about SMS for students?**  
A: Not included. Requirements specify push + inbox only.

**Q: How many schema changes to existing code?**  
A: Minimal - just add one parameter to Post creation (`message_type`). Everything else is new.

**Q: Can students delete messages?**  
A: Not in MVP. Can add in Phase 2.

**Q: Real-time sync between devices?**  
A: In MVP: Manual refresh. Phase 2: Add WebSocket or polling interval.

---

## 📅 Timeline

```
DAY 1: Setup + Database
  - Create tables
  - Write migrations
  - Update Post model

DAY 2: Backend API
  - Create StudentNotificationModule
  - Write 3 endpoints
  - Integration tests

DAY 3: Push Service
  - Update notification processor
  - Handle student messages
  - Test notifications

DAY 4: Mobile Push Setup
  - Token registration
  - Notification listeners
  - Error handling

DAY 5: Mobile UI
  - Message list component
  - Message detail screen
  - Read/unread logic

DAY 6: Testing & Polish
  - End-to-end testing
  - Bug fixes
  - Performance optimization

DAY 7: Deployment
  - Production migration
  - Monitor notifications
  - Rollback plan ready
```

---

**Version:** 1.0  
**Last Updated:** May 8, 2026
