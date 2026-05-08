# Student Notification System - Architecture & Implementation Reference

## 📐 Complete System Architecture

### Level 1: High-Level Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          ADMIN PANEL (Web)                                 │
│                    Creates and sends message                               │
└───────────────────────────────────────┬─────────────────────────────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────┐
                    │   Backend API - Post Creation      │
                    │   /admin-panel/post/create         │
                    │   Create: Post, PostStudent        │
                    │   Create: StudentMessage (NEW) ⭐  │
                    │   Create: PostParent (existing)    │
                    └───────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
        ┌───────────▼──────────────┐      ┌──────────▼───────────────┐
        │   Parent Notification    │      │  Student Notification    │
        │   Service (Existing)     │      │  Service (NEW) ⭐        │
        │                          │      │                          │
        │   Query: PostParent      │      │  Query: StudentMessage   │
        │   Token: Parent.arn      │      │  Token: StudentNotif..   │
        │   Send: SMS + Push       │      │  Send: Push only         │
        └───────────┬──────────────┘      └──────────┬───────────────┘
                    │                               │
        ┌───────────▼──────────────┐      ┌─────────▼────────────────┐
        │  Parent Mobile App       │      │ Student Mobile App (NEW) │
        │  (mobile-frontend)       │      │ (mobile-students) ⭐     │
        │                          │      │                          │
        │ ✓ Notifications          │      │ ✓ Notifications          │
        │ ✓ Message Inbox          │      │ ✓ Message Inbox          │
        │ ✓ Read Status            │      │ ✓ Read Status            │
        │ ✓ SMS Option             │      │ ✗ No SMS                 │
        └──────────────────────────┘      └──────────────────────────┘
```

### Level 2: Backend Data Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ EXISTING TABLES:                                                         │
│                                                                           │
│ Post (admin creates message)                                             │
│   ├─ id, title, description, priority, image                            │
│   ├─ admin_id, school_id, sent_at                                       │
│   ├─ message_type: 'parent' | 'student' | 'both' ⭐ [NEW COLUMN]      │
│   │                                                                       │
│   └─→ PostStudent (link post to target students)                        │
│       ├─ id, post_id, student_id, group_id                             │
│       │                                                                   │
│       ├─→ PostParent (parent of each student gets message)             │
│       │   ├─ id, post_student_id, parent_id                            │
│       │   ├─ viewed_at, push (0=sent, 1=pending)                       │
│       │   │                                                              │
│       │   └─→ Parent (parent account with device token)                │
│       │       ├─ id, cognito_sub_id, email, phone_number              │
│       │       └─ arn (Expo or AWS token)                               │
│       │                                                                  │
│       └─→ StudentMessage ⭐ [NEW TABLE]                                 │
│           ├─ id, post_id, student_id                                   │
│           ├─ push (0=sent, 1=pending), viewed_at                       │
│           │                                                              │
│           └─→ StudentNotificationToken ⭐ [NEW TABLE]                   │
│               ├─ id, student_id (UNIQUE), arn                          │
│               └─ (Expo or AWS token for this student)                  │
│                                                                          │
│ Student (already exists)                                                 │
│   └─ id, student_number, email, school_id, ...                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Level 3: API Endpoints & Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       API ENDPOINT MAP                                   │
├─────────────────────────────────────────────────────────────────────────┤

NEW ENDPOINTS (Student):
────────────────────────

POST /mobile/student/device-token ⭐
├─ Auth: Bearer token (Student)
├─ Body: { pushToken: "ExponentPushToken[...]" }
├─ Action: Save token to StudentNotificationToken.arn
├─ Response: { message: "Token stored", student_id: 1 }
└─ Error: 401 if not student, 400 if invalid token

GET /mobile/student/messages ⭐
├─ Auth: Bearer token (Student)
├─ Query: ?limit=50&offset=0
├─ Action: Query StudentMessage + join Post
├─ Response: {
│    messages: [
│      { id, post_id, title, description, priority,
│        image, sent_at, viewed_at, created_at }
│    ],
│    total: number,
│    offset: number,
│    limit: number,
│    hasMore: boolean
│  }
└─ Error: 401 if not student, 404 if not found

POST /mobile/student/message/:messageId/read ⭐
├─ Auth: Bearer token (Student)
├─ Action: UPDATE StudentMessage SET viewed_at = NOW()
├─ Response: { message: "Message marked as read" }
└─ Error: 401, 404 if message not found or not belongs to student


MODIFIED ENDPOINTS (Existing):
──────────────────────────────

POST /admin-panel/post/create
├─ NEW Param: message_type: 'parent' | 'student' | 'both'
├─ IF message_type = 'parent' or 'both':
│   └─ Create PostParent entries (existing logic)
└─ IF message_type = 'student' or 'both':
    └─ Create StudentMessage entries ⭐ (NEW logic)
```

### Level 4: Notification Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              BACKGROUND NOTIFICATION PROCESSOR                          │
│         (Runs periodically or event-driven)                             │
├─────────────────────────────────────────────────────────────────────────┤

STEP 1: Query Pending Notifications
────────────────────────────────────

FROM PostParent WHERE push = 1
  ↓ EXISTING
  Get token from Parent.arn
  Process for parent notifications

FROM StudentMessage WHERE push = 1 ⭐
  ↓ NEW
  Get token from StudentNotificationToken.arn
  Process for student notifications


STEP 2: Token Type Detection
─────────────────────────────

FOR EACH token:
  IF token.startsWith('ExponentPushToken'):
    → TYPE = EXPO
    → SERVICE = ExpoPushService

  ELSE IF token.startsWith('arn:aws:sns:'):
    → TYPE = AWS_PINPOINT
    → SERVICE = PinpointService

  ELSE IF isPhoneNumber(token):
    → TYPE = SMS
    → SERVICE = SMSService


STEP 3: Send Notifications
──────────────────────────

FOR EACH pending message:
  notification_payload = {
    to: token,
    title: message.title,
    body: message.description,
    data: {
      messageId: message.id,
      postId: message.post_id,
      type: 'STUDENT_MESSAGE' or 'PARENT_MESSAGE'
    }
  }

  TRY:
    result = await sendToService(notification_payload)
    ✓ Mark sent: UPDATE push = 0
  CATCH error:
    IF error.isExpiredToken:
      ✓ Mark sent: UPDATE push = 0 (don't retry expired tokens)
      ✓ Delete token: DELETE FROM StudentNotificationToken
    ELSE:
      ✗ Keep push = 1 (will retry next cycle)
      Log error for debugging


STEP 4: Result Tracking
───────────────────────

StudentMessage.push:
  1 = Notification pending
  0 = Notification sent successfully
  (no column for failed status - retries automatically)

PostParent.push:
  1 = Notification pending
  0 = Notification sent successfully
  (same pattern)
```

### Level 5: Mobile App State Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MOBILE APP STATE MACHINE                             │
├─────────────────────────────────────────────────────────────────────────┤

APP LAUNCH
    ↓
    ├─ (1) Initialize Notifications
    │   ├─ Request permissions
    │   ├─ Create Android channels
    │   ├─ Get Expo push token
    │   └─ Save to AsyncStorage
    │
    ├─ (2) Register Token with Backend
    │   └─ POST /mobile/student/device-token
    │       └─ TokenNotification.arn = token
    │
    ├─ (3) Setup Listeners
    │   ├─ notificationReceived (while app open)
    │   ├─ notificationResponse (user taps)
    │   └─ pushToken (token refresh)
    │
    └─ (4) Load Messages
        └─ GET /mobile/student/messages
            └─ Save to local SQLite
                └─ Display MessageList

HOME PAGE
    │
    ├─ [Pull to Refresh]
    │   └─ Fetch latest messages
    │       └─ Update local DB
    │
    ├─ [Infinite Scroll]
    │   └─ onEndReached()
    │       └─ Load next page
    │
    └─ [Tap Message Card]
        └─ Navigation to MessageDetail
            └─ Fetch full content
            └─ POST /mobile/student/message/:id/read
                └─ Update read status

NOTIFICATION RECEIVED
    │
    ├─ [While App Open]
    │   └─ Show banner notification
    │       └─ Update message list locally
    │
    ├─ [App in Background]
    │   └─ System notification
    │       └─ On tap:
    │           └─ Open app
    │           └─ Fetch message content
    │           └─ Navigate to detail
    │
    └─ [App Closed]
        └─ Device notification queue
            └─ On tap:
                └─ Launch app
                └─ Same flow as background

TOKEN REFRESH
    │
    └─ Expo SDK detects token change
        └─ notificationResponseReceived listener
            └─ POST /mobile/student/device-token (new token)
                └─ StudentNotificationToken.arn updated
```

---

## 🔐 Security Considerations

### Authentication & Authorization

```typescript
// All student notification endpoints require:
1. Bearer token with student role
2. Token must match requesting student (not other students' messages)

Example Protection:
┌───────────────────────────────────────────┐
│ GET /mobile/student/messages              │
├───────────────────────────────────────────┤
│ @UseGuards(JwtGuard)                      │
│ @UseGuards(StudentGuard)  ⭐              │
│                                            │
│ async getMessages(@GetUser() user) {      │
│   // user.studentId comes from JWT       │
│   // Query only this student's messages  │
│   const msgs = await repo.getMessages(   │
│     user.studentId  ← VERIFIED           │
│   );                                      │
│   return msgs;  ← Only this student's    │
│ }                                         │
└───────────────────────────────────────────┘
```

### Data Privacy

```
✓ Students can only see their own messages
✓ Students cannot see other students' messages
✓ Admin cannot access student tokens (only system reads)
✓ Tokens are encrypted in transit (HTTPS/TLS)
✓ No personal data in push notifications (only IDs)
✓ Messages not stored permanently in push service
```

### Token Management

```
Device Token Lifecycle:
  1. App generates token (Expo/AWS)
  2. Stored in StudentNotificationToken table
  3. Each student can have 1 token (UNIQUE constraint)
  4. Token changes on:
     - App reinstall
     - Token expiration (periodically)
     - Device update
  5. Change detected via listener
  6. New token sent to backend
  7. Old token replaced
  8. Old token automatically cleaned up on next notification send

Expired Token Handling:
  When push service returns "invalid token":
    DELETE FROM StudentNotificationToken WHERE id = ?
    Mark as sent (don't retry expired tokens)
    Student must re-register on next app launch
```

---

## 🧹 Cleanup & Maintenance

### Database Cleanup

```sql
-- Remove orphaned StudentMessage for deleted students
DELETE FROM StudentMessage
WHERE student_id NOT IN (SELECT id FROM Student);

-- Remove orphaned tokens for deleted students
DELETE FROM StudentNotificationToken
WHERE student_id NOT IN (SELECT id FROM Student);

-- Archive old read messages (optional, Phase 2)
DELETE FROM StudentMessage
WHERE viewed_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Run monthly or on-demand
```

### Push Service Maintenance

```typescript
// Automatic cleanup on failed sends:
for (const notification of pending) {
  try {
    await expoPush.send(notification);
  } catch (error) {
    if (error.code === "INVALID_TOKEN" || error.code === "UNREGISTERED_TOKEN") {
      // Automatically delete invalid token
      await tokenRepo.deleteToken(notification.student_id);
    }
  }
}
```

### Monitoring & Alerts

```
Metrics to Track:
  1. Notifications sent per day
  2. Notifications failed per day (% failure rate)
  3. Delivery latency (p50, p95, p99)
  4. Token refresh rate
  5. Message read rate
  6. API response times
  7. Database query times

Alert Thresholds:
  if (failureRate > 2%) {
    ALERT("Student notification failure rate high")
  }
  if (deliveryLatency_p95 > 10_000ms) {
    ALERT("Student notification latency degraded")
  }
  if (invalidTokens_daily > 100) {
    ALERT("High invalid token rate - check SDK version")
  }
```

---

## ✅ Implementation Checklist

### Pre-Implementation

- [ ] Backup production database
- [ ] Prepare rollback SQL scripts
- [ ] Review security requirements with team
- [ ] Set up monitoring/alerting
- [ ] Create test school and test students
- [ ] Document deployment process

### Database

- [ ] Create StudentNotificationToken table
- [ ] Create StudentMessage table
- [ ] Add message_type column to Post
- [ ] Add indexes for performance
- [ ] Run migration on staging first
- [ ] Verify migration success
- [ ] Document migration SQL

### Backend - Module Creation

- [ ] Create student-notification folder
- [ ] Create StudentNotificationController
- [ ] Create StudentNotificationService
- [ ] Create StudentNotificationRepository
- [ ] Create DTOs
- [ ] Create StudentNotificationModule
- [ ] Register module in AppModule
- [ ] Write unit tests
- [ ] Write integration tests

### Backend - Post Service Changes

- [ ] Add message_type parameter to post creation
- [ ] Update createPost() to check message_type
- [ ] Call syncNewPostToStudents() for student messages
- [ ] Update tests for new parameter
- [ ] Verify existing parent flow still works

### Backend - Push Service Changes

- [ ] Create student-push-notifications handler
- [ ] Implement StudentMessage query
- [ ] Implement token type detection
- [ ] Implement notification sending
- [ ] Integrate into main scheduler
- [ ] Test with sample notifications
- [ ] Verify notification sent tracking

### Mobile - Setup & Dependencies

- [ ] Add expo-notifications to package.json
- [ ] Add @react-native-async-storage/async-storage
- [ ] npm install
- [ ] Verify no dependency conflicts
- [ ] Update tsconfig if needed

### Mobile - Notification System

- [ ] Create utils/notifications.ts
- [ ] Implement token registration
- [ ] Implement notification listeners
- [ ] Implement token refresh listener
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical devices

### Mobile - Message Fetching

- [ ] Create services/messageService.ts
- [ ] Create hooks/useMessages.ts
- [ ] Implement pagination logic
- [ ] Implement refresh logic
- [ ] Test with real backend

### Mobile - UI Components

- [ ] Create MessageCard component
- [ ] Create MessageDetail screen
- [ ] Create EmptyMessagesList component
- [ ] Style components per design
- [ ] Test components in isolation
- [ ] Test on multiple screen sizes

### Mobile - Integration

- [ ] Update app/\_layout.tsx to init notifications
- [ ] Update home tab to display messages
- [ ] Update navigation routing
- [ ] Add deep linking for notifications
- [ ] Test end-to-end

### Testing

- [ ] Unit tests for all services
- [ ] Integration tests for API
- [ ] E2E test: admin send → student receive
- [ ] Test bulk sends (100+ students)
- [ ] Test token refresh
- [ ] Test offline → online sync
- [ ] Test multiple devices per student
- [ ] Performance testing (load)
- [ ] Security testing (authorization)

### Deployment

- [ ] Merge feature branch to staging
- [ ] Deploy to staging environment
- [ ] Smoke tests on staging
- [ ] Performance baseline on staging
- [ ] Security scan on staging
- [ ] Merge to main branch
- [ ] Deploy to production
- [ ] Verify production endpoints
- [ ] Monitor push notifications
- [ ] Monitor error logs
- [ ] Prepare rollback plan

### Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Collect metrics
- [ ] Gather user feedback
- [ ] Document known issues
- [ ] Plan Phase 2 improvements
- [ ] Send team summary

---

## 📊 Expected Performance Metrics

### Backend Performance

```
API Response Times:
  POST /mobile/student/device-token:    <100ms (simple write)
  GET /mobile/student/messages:          <200ms (indexed query)
  POST /mobile/student/message/:id/read: <50ms (simple update)

Database Queries:
  StudentMessage JOIN Post:              <50ms with indexes
  StudentNotificationToken lookup:       <10ms (unique key)
  StudentMessage bulk insert (1000):     <200ms

Push Notification Sending:
  Batch of 1000 notifications:           ~10-15 seconds
  Per notification:                       ~10-15ms
  Success rate:                          >98% (typical for Expo)
```

### Mobile Performance

```
App Launch:
  To home screen with messages:         <3 seconds
  Push token registered:                <5 seconds

Message List:
  Initial load (50 messages):           <500ms
  Infinite scroll load (next 50):       <300ms
  Pull-to-refresh:                      <1 second
  Render 50 message cards:              <100ms

Message Detail:
  Open and render:                      <300ms
  Mark as read:                         <200ms

Push Notifications:
  Notification display:                 <100ms after receive
  Notification tap → screen open:       <2 seconds
```

### Expected Scale

```
Production Target (after 1 month):
  Schools:                    150
  Students:                   500,000
  Admin users:                1,500
  Messages sent per day:      10,000-50,000
  Student messages per day:   500,000-2,500,000
  Peak throughput:            ~30 messages/second
  Concurrent users:           ~10,000
  Push notifications sent:    ~500,000 per day
```

---

## 🚨 Troubleshooting Guide

### Issue: No Push Notifications Received

```
CHECK LIST:
1. Student token registered?
   SELECT * FROM StudentNotificationToken WHERE student_id = ?;

2. Message created for student?
   SELECT * FROM StudentMessage WHERE student_id = ?;

3. Notification marked pending?
   SELECT * FROM StudentMessage WHERE student_id = ? AND push = 1;

4. Notification processor running?
   Logs: Check push-notification service logs

5. Token expired?
   Try re-registering token in app

6. Expo API key valid?
   Check environment variables in push service
```

### Issue: Messages Not Appearing in App

```
CHECK LIST:
1. GET /mobile/student/messages returns data?
   curl http://localhost:3001/mobile/student/messages -H "Authorization: Bearer TOKEN"

2. Messages saved to local SQLite?
   Check app database file (DevTools or file explorer)

3. Message cards rendering?
   Check React Native console for errors

4. Network request successful?
   Check network tab in DevTools

5. Student ID matching?
   Verify student_id in JWT token matches authenticated student
```

### Issue: Token Registration Fails

```
CHECK LIST:
1. Valid Expo token format?
   Logs: ExponentPushToken[abc123...]

2. Backend endpoint accessible?
   curl -X POST http://localhost:3001/mobile/student/device-token

3. Authentication valid?
   Bearer token includes student role?

4. Token already exists?
   Check UNIQUE constraint on StudentNotificationToken

5. Network timeout?
   Check network connectivity and firewall
```

### Issue: High Failure Rate

```
CHECK LIST:
1. Expired tokens?
   Implement automatic cleanup on 400/401 responses

2. Rate limiting?
   Check if Expo service is rate-limiting requests

3. Database connection pooling?
   Verify connection limits not exceeded

4. Service availability?
   Check Expo status page: status.expo.io

5. S3 image errors?
   Check image URLs in message payload are accessible
```

---

## 📚 Code Examples

### Example 1: Register Student Token (Mobile)

```typescript
// mobile-students/app/_layout.tsx

import { useEffect } from 'react';
import { initStudentPushNotifications } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';

export default function RootLayout() {
  const { authToken } = useAuth();

  useEffect(() => {
    // Initialize notifications after auth is ready
    if (authToken) {
      initStudentPushNotifications()
        .catch(error => console.error('Push init failed:', error));
    }
  }, [authToken]);

  return (
    // App layout...
  );
}
```

### Example 2: Display Messages in Home (Mobile)

```typescript
// mobile-students/app/(tabs)/index.tsx

import { useMessages } from '@/hooks/useMessages';
import MessageCard from '@/components/MessageCard';

export default function HomeScreen() {
  const { messages, refreshing, refreshMessages, loadMoreMessages } =
    useMessages();

  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => <MessageCard message={item} />}
      keyExtractor={(item) => item.id.toString()}
      onEndReached={loadMoreMessages}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshMessages}
        />
      }
    />
  );
}
```

### Example 3: Send Message to Students (Admin)

```typescript
// Admin panel sends message

POST /admin-panel/post/create
{
  "title": "Math Assignment",
  "description": "Complete pages 50-55 for Friday",
  "priority": "high",
  "students": [101, 102, 103],  // Student IDs
  "groups": [5],                 // Group IDs
  "message_type": "student"      // ⭐ NEW: Send to students
}

BACKEND PROCESSING:
1. Create Post record
2. Create PostStudent entries (101, 102, 103)
3. Because message_type = 'student':
   → Create StudentMessage for each of 101, 102, 103
   → Mark push = 1
4. Return Post object

LATER:
5. Push processor finds StudentMessage with push = 1
6. Gets StudentNotificationToken.arn for each student
7. Sends push notification via Expo
8. Updates push = 0
9. Student app receives notification
10. Student sees message in home page inbox
```

### Example 4: Query Messages for Dashboard

```typescript
// Backend service - get all messages for a student

async getStudentMessages(
  studentId: number,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    // Get paginated messages
    this.db.query(`
      SELECT
        sm.id,
        sm.post_id,
        sm.viewed_at,
        p.title,
        p.description,
        p.priority,
        p.image,
        p.sent_at,
        p.created_at
      FROM StudentMessage sm
      JOIN Post p ON sm.post_id = p.id
      WHERE sm.student_id = ?
      ORDER BY p.sent_at DESC
      LIMIT ? OFFSET ?
    `, [studentId, limit, offset]),

    // Get total count
    this.db.query(`
      SELECT COUNT(*) as count
      FROM StudentMessage
      WHERE student_id = ?
    `, [studentId])
  ]);

  return {
    messages,
    total: total[0].count,
    page,
    limit,
    totalPages: Math.ceil(total[0].count / limit)
  };
}
```

---

## 🎓 Learning Resources

**For Team Members:**

1. **Push Notifications**
   - Read: [Expo Notifications Documentation](https://docs.expo.dev/push-notifications/)
   - Time: 1 hour
   - Topics: Token management, notification payload, listeners

2. **Database Design**
   - Review: Current Parent schema → understand before building Student version
   - Study: Foreign keys, indexes, unique constraints
   - Time: 30 minutes

3. **Backend Architecture**
   - Review: `backend/src/modules/post/` - understand existing pattern
   - Replicate: Same pattern for student notifications
   - Time: 1 hour

4. **Mobile State Management**
   - Review: `mobile-frontend/contexts/` - context patterns
   - Review: `mobile-frontend/hooks/` - custom hook patterns
   - Time: 45 minutes

5. **API Design**
   - Study: RESTful endpoint patterns in existing code
   - Learn: Pagination, filtering, error handling
   - Time: 30 minutes

---

**Document Version:** 1.0  
**Last Updated:** May 8, 2026  
**Status:** Ready for Implementation  
**Maintainer:** Development Team
