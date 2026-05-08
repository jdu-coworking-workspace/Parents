# 📋 Task Breakdown - Student Mobile Notification System

**Total Tasks:** 53  
**Phases:** 6 (Database, Backend, Push Service, Mobile, Testing, Deployment)  
**Estimated Timeline:** 7-11 days

---

## 🗓️ PHASE 1: DATABASE SETUP (30 min)

**Estimated Time:** 30 minutes  
**Dependencies:** None  
**Tasks:**

### Task 1: Create StudentNotificationToken table

- **File:** `backend/database.sql`
- **What:** Create table for storing student device tokens
- **SQL:**

```sql
CREATE TABLE StudentNotificationToken (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  arn TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  KEY idx_student_arn (student_id, arn)
);
```

- **Verify:** Check table exists, indexes created

### Task 2: Create StudentMessage table

- **File:** `backend/database.sql`
- **What:** Create table for tracking student messages
- **SQL:**

```sql
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
  KEY idx_student_message_push (student_id, push),
  KEY idx_student_message_view (student_id, viewed_at)
);
```

- **Verify:** Check table exists, all constraints in place

### Task 3: Add message_type column to Post

- **File:** `backend/database.sql`
- **What:** Add column to distinguish parent/student/both messages
- **SQL:**

```sql
ALTER TABLE Post ADD COLUMN message_type
  ENUM('parent', 'student', 'both') DEFAULT 'parent';
```

- **Verify:** Column exists, default value set

### Task 4: Add indexes for performance

- **File:** `backend/database.sql`
- **What:** Ensure all indexes created for query performance
- **Verify:** Run `SHOW INDEX FROM StudentNotificationToken;` and `SHOW INDEX FROM StudentMessage;`

### Task 5: Test migration on staging

- **What:** Run migration on staging environment first
- **Steps:**
  1. Backup staging database
  2. Run migration
  3. Verify tables created
  4. Test queries perform well

---

## 🔧 PHASE 2: BACKEND IMPLEMENTATION (2-3 days)

**Estimated Time:** 2-3 days  
**Dependencies:** Phase 1 (Database)  
**Key Folders to Create:** `backend/src/modules/student-notification/`

### Task 6: Create StudentNotificationModule folder structure

- **Location:** `backend/src/modules/student-notification/`
- **Create:**
  ```
  student-notification/
  ├── student-notification.controller.ts
  ├── student-notification.service.ts
  ├── student-notification.repository.ts
  ├── student-notification.module.ts
  └── dto/
      ├── save-student-token.dto.ts
      └── get-messages.dto.ts
  ```

### Task 7: Implement StudentNotificationController

- **File:** `backend/src/modules/student-notification/student-notification.controller.ts`
- **Endpoints to implement:**
  1. `POST /mobile/student/device-token` - Save token
  2. `GET /mobile/student/messages` - Fetch messages
  3. `POST /mobile/student/message/:messageId/read` - Mark read
- **Reference:** IMPLEMENTATION_GUIDE.md Section 6.3

### Task 8: Implement StudentNotificationService

- **File:** `backend/src/modules/student-notification/student-notification.service.ts`
- **Methods:**
  - `saveStudentToken(studentId, token)`
  - `getMessages(studentId, limit, offset)`
  - `markMessageAsRead(messageId, studentId)`
  - `getUnreadCount(studentId)`
- **Reference:** IMPLEMENTATION_GUIDE.md Section 6.3

### Task 9: Implement StudentNotificationRepository

- **File:** `backend/src/modules/student-notification/student-notification.repository.ts`
- **Database operations:**
  - Token CRUD
  - Message queries
  - Batch operations
- **Reference:** IMPLEMENTATION_GUIDE.md Section 6.3

### Task 10: Create StudentNotificationModule registration

- **File:** `backend/src/modules/student-notification/student-notification.module.ts`
- **Export:** Controller, Service, Repository
- **Pattern:** Follow existing NestJS module pattern

### Task 11: Register module in AppModule

- **File:** `backend/src/app.module.ts`
- **Add:** `StudentNotificationModule` to imports
- **Verify:** Module loads without errors

### Task 12: Modify PostService for StudentMessage creation

- **File:** `backend/src/modules/post/post.service.ts`
- **Modify method:** `createPost()`
- **Add logic:**
  ```typescript
  if (messageType !== "parent") {
    await this.studentNotificationRepository.createStudentMessagesForPost(
      postId,
    );
  }
  ```
- **Inject:** StudentNotificationRepository into PostService

### Task 13: Write unit tests for services

- **Test:** Each service method independently
- **Coverage:**
  - Token validation
  - Message queries
  - Read tracking
  - Error handling
- **Target:** >80% code coverage

### Task 14: Write integration tests for endpoints

- **Test:** All 3 endpoints end-to-end
- **Coverage:**
  - Valid requests
  - Invalid inputs
  - Authorization
  - Database state changes
- **Run:** `npm test` successfully

---

## 📡 PHASE 3: PUSH NOTIFICATION SERVICE (1 day)

**Estimated Time:** 1 day  
**Dependencies:** Phase 1 (Database)  
**Related Services:** `push-notification` module

### Task 15: Create student-push-notifications handler

- **File:** `push-notification/src/handlers/notifications/student-push-notifications.ts`
- **Implementation:**
  - Query StudentMessage with push=1
  - Get tokens from StudentNotificationToken
  - Send via Expo/AWS
  - Update push=0 on success
- **Reference:** IMPLEMENTATION_GUIDE.md Section 5

### Task 16: Integrate into main scheduler

- **File:** `push-notification/src/index.ts` (or main handler)
- **Add:** Call to `processStudentNotifications()` in scheduler
- **Timing:** Run same frequency as parent notifications

### Task 17: Test notification delivery

- **Manual test:**
  1. Create student with token
  2. Create StudentMessage with push=1
  3. Run notification processor
  4. Verify push sent
  5. Verify push=0 after send
- **Check logs:** Verify notification events logged

---

## 📱 PHASE 4: MOBILE APP IMPLEMENTATION (3-5 days)

**Estimated Time:** 3-5 days  
**Dependencies:** Phase 2 (Backend endpoints exist)  
**App:** `mobile-students`

### Task 18: Add expo-notifications dependency

- **File:** `mobile-students/package.json`
- **Add:** `"expo-notifications": "^0.28.0"`
- **Run:** `npm install`
- **Verify:** No conflicts with existing dependencies

### Task 19: Create utils/notifications.ts

- **File:** `mobile-students/utils/notifications.ts`
- **Functions:**
  - `initStudentPushNotifications()` - Initialize
  - `sendTokenToBackend(token)` - Register
  - `setupNotificationListeners()` - Setup listeners
  - `handleNotificationReceived()` - Handle foreground
  - `handleNotificationResponse()` - Handle tap
- **Reference:** IMPLEMENTATION_GUIDE.md Section 5 (Phase 3)

### Task 20: Create services/messageService.ts

- **File:** `mobile-students/services/messageService.ts`
- **Functions:**
  - `fetchMessages(authToken, offset, limit)` - Get messages
  - `markMessageAsRead(authToken, messageId)` - Mark read
  - `saveStudentToken(authToken, pushToken)` - Register token
- **Error handling:** Retry logic for network errors

### Task 21: Create hooks/useMessages.ts

- **File:** `mobile-students/hooks/useMessages.ts`
- **Exports:**
  - `useMessages()` hook
  - State: messages, loading, hasMore, offset
  - Functions: refreshMessages(), loadMoreMessages(), markAsRead()
- **Features:** Pagination, refresh, error handling

### Task 22: Create components/MessageCard.tsx

- **File:** `mobile-students/components/MessageCard.tsx`
- **Props:** Message object
- **Display:**
  - Title (bold if unread)
  - Description (preview)
  - Priority badge
  - Timestamp
  - Unread indicator
- **Action:** onPress navigates to detail

### Task 23: Create components/MessageDetail.tsx

- **File:** `mobile-students/components/MessageDetail.tsx`
- **Display:**
  - Full title
  - Full description
  - Image (if exists)
  - Full timestamp
- **Action:**
  - Mark as read on open
  - Back button

### Task 24: Create app/message/[id].tsx screen

- **File:** `mobile-students/app/message/[id].tsx`
- **Route:** `/message/123`
- **Load:** Message detail screen
- **Params:** messageId from navigation

### Task 25: Update app/\_layout.tsx for notifications

- **File:** `mobile-students/app/_layout.tsx`
- **Add:**
  ```typescript
  useEffect(() => {
    initStudentPushNotifications();
  }, []);
  ```
- **Call:** In app lifecycle (after auth ready)

### Task 26: Update app/(tabs)/index.tsx for message list

- **File:** `mobile-students/app/(tabs)/index.tsx`
- **Replace:** Current home screen content
- **Add:**
  - MessageList component
  - Pull-to-refresh
  - Infinite scroll
  - Loader state
  - Empty state
- **Integration:** Use useMessages() hook

### Task 27: Create utils/date.ts helper

- **File:** `mobile-students/utils/date.ts`
- **Function:** `formatDate(date)` - Format timestamps
- **Example:** "Today at 2:30 PM" or "May 8"

### Task 28: Create utils/priority.ts helper

- **File:** `mobile-students/utils/priority.ts`
- **Functions:**
  - `getPriorityColor(priority)` - Return color code
  - `getPriorityLabel(priority)` - Return display label
- **Map:** low/medium/high → colors

### Task 29: Create types/message.ts interfaces

- **File:** `mobile-students/types/message.ts`
- **Interfaces:**
  ```typescript
  interface Message {
    id: number;
    post_id: number;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    image?: string;
    sent_at: string;
    viewed_at?: string;
  }
  ```

### Task 30: Test on iOS simulator

- **Steps:**
  1. Run `npx expo start`
  2. Press `i` for iOS
  3. Test token registration
  4. Test message fetching
  5. Test message display
  6. Test notification receipt

### Task 31: Test on Android emulator

- **Steps:**
  1. Run `npx expo start`
  2. Press `a` for Android
  3. Test token registration
  4. Test message fetching
  5. Test message display
  6. Test notification receipt

---

## 🧪 PHASE 5: TESTING (1-2 days)

**Estimated Time:** 1-2 days  
**Dependencies:** All previous phases

### Task 32: Write backend token endpoint tests

- **Test:** POST /mobile/student/device-token
- **Cases:**
  - Valid token registration
  - Token update (replace old)
  - Invalid token format
  - Unauthorized request
  - Not student error
- **Result:** All tests pass

### Task 33: Write backend messages fetch tests

- **Test:** GET /mobile/student/messages
- **Cases:**
  - Fetch messages for student
  - Pagination (limit/offset)
  - Sorted by sent_at DESC
  - Only this student's messages
  - Empty result
  - Unauthorized
- **Result:** All tests pass

### Task 34: Write backend read tracking tests

- **Test:** POST /mobile/student/message/:id/read
- **Cases:**
  - Mark message as read
  - viewed_at timestamp set
  - Cannot read other students' messages
  - Message not found error
- **Result:** All tests pass

### Task 35: End-to-end test: admin send → student receives

- **Flow:**
  1. Admin creates message
  2. Wait for notification processor
  3. Student app receives push
  4. Check message appears in app
  5. Tap notification
  6. Verify navigates to detail
  7. Mark as read
  8. Verify read status in backend
- **Result:** Full flow works

### Task 36: Test bulk sends (100+ students)

- **Setup:** Create 100+ test students
- **Action:** Admin sends to all
- **Verify:**
  - All receive notifications
  - Delivery <60 seconds
  - No duplicates
  - Read tracking works
- **Result:** Scales to bulk sends

### Task 37: Test multiple devices per student

- **Setup:** Student installs on 2 devices
- **Action:** Admin sends message
- **Verify:**
  - Both devices receive
  - Message reads sync between devices
- **Result:** Multi-device works

### Task 38: Test offline behavior and sync

- **Flow:**
  1. App goes offline
  2. Push notification queued
  3. App comes online
  4. Message syncs
  5. Notification delivered
- **Result:** Offline → online works

### Task 39: Performance testing (API response times)

- **Measure:**
  - Token registration: <100ms
  - Message fetch (50): <200ms
  - Mark read: <50ms
  - Bulk query (1000): <500ms
- **Result:** Targets met

### Task 40: Security testing (authorization checks)

- **Test:**
  - Cannot view other students' messages
  - Cannot mark other students' messages
  - Cannot register token for other student
  - Admin cannot access tokens
- **Result:** All security checks pass

---

## 🚀 PHASE 6: DEPLOYMENT (1-2 days)

**Estimated Time:** 1-2 days  
**Dependencies:** All previous phases complete

### Task 41: Run database migration on staging

- **Steps:**
  1. Backup staging DB
  2. Run migration script
  3. Verify tables created
  4. Verify indexes exist
  5. Test queries work
- **Result:** Migration succeeds

### Task 42: Deploy backend to staging

- **Steps:**
  1. Merge code to staging branch
  2. Deploy to staging server
  3. Verify endpoints accessible
  4. Run smoke tests
  5. Check logs for errors
- **Result:** Backend running on staging

### Task 43: Deploy push service to staging

- **Steps:**
  1. Deploy handler code
  2. Verify scheduler running
  3. Test notification sending
  4. Monitor logs
- **Result:** Push service working on staging

### Task 44: Smoke tests on staging

- **Test:**
  - Create test student
  - Register token
  - Admin sends message
  - Student receives notification
  - Message appears in app
- **Result:** E2E flow works on staging

### Task 45: Build mobile app for staging

- **Steps:**
  1. Build APK for Android
  2. Build IPA for iOS
  3. Distribute to testers
  4. Collect feedback
- **Result:** Staging builds ready

### Task 46: Run database migration on production

- **Steps:**
  1. Backup production DB
  2. Schedule maintenance window
  3. Run migration
  4. Verify tables created
  5. Verify no data loss
- **Result:** Migration succeeds

### Task 47: Deploy backend to production

- **Steps:**
  1. Merge to main branch
  2. Deploy to production
  3. Verify endpoints accessible
  4. Monitor for errors
  5. Check metrics
- **Result:** Backend live in production

### Task 48: Deploy push service to production

- **Steps:**
  1. Deploy handler
  2. Verify scheduler running
  3. Monitor notifications
  4. Check delivery rate
- **Result:** Push service live in production

### Task 49: Deploy mobile app to stores

- **Steps:**
  1. Submit to App Store (iOS)
  2. Submit to Google Play (Android)
  3. Wait for approval
  4. Publish when ready
  5. Monitor ratings/reviews
- **Result:** App live in stores

### Task 50: Setup monitoring and alerts

- **Setup:**
  - Metrics dashboard (notification send rate, delivery time)
  - Alerts: >2% failure rate
  - Alerts: >10s delivery latency
  - Alerts: High invalid token rate
  - Error logging
- **Result:** Monitoring active

---

## ✅ PHASE 7: POST-DEPLOYMENT (1 day)

**Estimated Time:** 1 day  
**Dependencies:** Deployment complete

### Task 51: Monitor for 24 hours

- **Watch:**
  - Notification delivery
  - API response times
  - Error rates
  - User feedback
  - System stability
- **Result:** No critical issues

### Task 52: Collect metrics and feedback

- **Gather:**
  - Push delivery stats
  - API performance
  - Mobile app stability
  - User feedback
  - Error logs
- **Document:** Performance baseline

### Task 53: Document known issues

- **Create:** Issues log
- **Include:**
  - Minor bugs found
  - Future improvements
  - Edge cases to handle
  - Performance notes
- **Result:** Ready for Phase 2

---

## 📊 Task Summary by Phase

| Phase              | Tasks  | Estimated Time | Dependencies |
| ------------------ | ------ | -------------- | ------------ |
| 1. Database        | 5      | 30 min         | None         |
| 2. Backend         | 9      | 2-3 days       | Phase 1      |
| 3. Push Service    | 3      | 1 day          | Phase 1      |
| 4. Mobile          | 14     | 3-5 days       | Phase 2      |
| 5. Testing         | 9      | 1-2 days       | All previous |
| 6. Deployment      | 9      | 1-2 days       | All previous |
| 7. Post-Deployment | 3      | 1 day          | Phase 6      |
| **TOTAL**          | **53** | **7-11 days**  | Sequential   |

---

## 👥 Team Allocation

### **Backend Developer (1 person)**

- Tasks: 1-14 (Database + Backend implementation)
- Time: 2.5-3.5 days

### **Push Service Developer (1 person)**

- Tasks: 15-17 (Push notification integration)
- Time: 1 day
- _Can work in parallel with Backend_

### **Mobile Developer (1 person)**

- Tasks: 18-31 (Mobile implementation + testing)
- Time: 4-6 days

### **QA/Tester (1 person)**

- Tasks: 32-40 (Testing)
- Time: 1-2 days
- _Starts after Backend ready_

### **DevOps/Release Manager (1 person)**

- Tasks: 41-50 (Deployment)
- Time: 1-2 days
- _Starts after Testing passes_

### **Post-Deployment Support (1 person)**

- Tasks: 51-53 (Monitoring)
- Time: 1 day
- _After deployment live_

---

## 🔄 Task Dependencies

```
Phase 1 (Database)
    ↓
├─→ Phase 2 (Backend) ──→ Phase 4 (Mobile)
└─→ Phase 3 (Push Service)
    ↓
    Phase 5 (Testing)
    ↓
    Phase 6 (Deployment)
    ↓
    Phase 7 (Post-Deployment)
```

**Parallel Work Possible:**

- Backend (Phase 2) and Push Service (Phase 3) can work in parallel after database ready
- Mobile (Phase 4) can start when Backend endpoints ready

---

## ✨ Completion Criteria for Each Task

### ✅ Database Tasks

- Tables created with correct columns
- Constraints in place (UNIQUE, FK, etc.)
- Indexes created
- Migration runs without errors

### ✅ Backend Tasks

- Code compiles without errors
- Tests pass (unit + integration)
- Endpoints respond correctly
- Data correctly stored in DB

### ✅ Push Service Tasks

- Handler processes StudentMessage correctly
- Notifications sent successfully
- Tracking flags updated (push=0)
- Error handling works

### ✅ Mobile Tasks

- Components render without errors
- Token registration works
- Messages fetch and display
- Notifications received
- Works on iOS and Android

### ✅ Testing Tasks

- All test cases pass
- No regressions
- Performance targets met
- Security requirements met

### ✅ Deployment Tasks

- Code deployed successfully
- No errors in logs
- Endpoints accessible
- Monitoring active

### ✅ Post-Deployment Tasks

- System stable after 24 hours
- Metrics collected
- Issues documented

---

**Status:** Ready to start  
**Team:** 2-3 developers recommended  
**Timeline:** 7-11 days (or 1-2 weeks at normal pace)  
**Priority:** High (500K students waiting)

🚀 **Begin with Task 1: Create StudentNotificationToken table**
