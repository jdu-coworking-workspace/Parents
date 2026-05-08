# Student Mobile Notification System Implementation Guide

> Adapted from Parent Mobile Notification Architecture
> Status: Implementation Plan | Date: May 8, 2026

---

## 📋 TABLE OF CONTENTS

1. [Current Parent Architecture](#1-current-parent-architecture)
2. [Message Send Flow Analysis](#2-message-send-flow-analysis)
3. [Parent Mobile Notification Analysis](#3-parent-mobile-notification-analysis)
4. [Parent Home Page Message Flow](#4-parent-home-page-message-flow)
5. [Student Version Implementation Plan](#5-student-version-implementation-plan)
6. [Required Backend Changes](#6-required-backend-changes)
7. [Required Mobile Changes](#7-required-mobile-changes)
8. [Reusable Components & Code](#8-reusable-components--code)
9. [Architecture Diagram](#9-architecture-diagram)
10. [Risks & Edge Cases](#10-risks--edge-cases)
11. [Final Recommended Architecture](#11-final-recommended-architecture)

---

## 1. CURRENT PARENT ARCHITECTURE

### 1.1 Database Schema - Message Tables

```sql
-- Admin-created messages/posts
CREATE TABLE Post (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'low',
  image VARCHAR(255),                    -- S3 image URL
  admin_id INT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE,
  school_id INT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES Admin(id),
  FOREIGN KEY (school_id) REFERENCES School(id)
);

-- Links posts to target students
CREATE TABLE PostStudent (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  student_id INT NOT NULL,
  group_id INT,                         -- If added via group
  FOREIGN KEY (post_id) REFERENCES Post(id),
  FOREIGN KEY (student_id) REFERENCES Student(id),
  FOREIGN KEY (group_id) REFERENCES StudentGroup(id)
);

-- Links posts to parents of students (notification tracking)
CREATE TABLE PostParent (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_student_id INT NOT NULL,
  parent_id INT NOT NULL,
  viewed_at DATETIME,                   -- When parent viewed message
  push TINYINT(1) DEFAULT 1,            -- Notification flag: 1=pending, 0=sent
  FOREIGN KEY (post_student_id) REFERENCES PostStudent(id),
  FOREIGN KEY (parent_id) REFERENCES Parent(id)
);

-- Parent account with device token
CREATE TABLE Parent (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cognito_sub_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  phone_number VARCHAR(255) UNIQUE,
  given_name VARCHAR(255),
  family_name VARCHAR(255),
  school_id INT NOT NULL,
  arn TEXT,                              -- DEVICE TOKEN STORED HERE ⭐
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  FOREIGN KEY (school_id) REFERENCES School(id)
);

-- Parent-student relationships
CREATE TABLE StudentParent (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  UNIQUE KEY (parent_id, student_id),
  FOREIGN KEY (parent_id) REFERENCES Parent(id),
  FOREIGN KEY (student_id) REFERENCES Student(id)
);
```

**Location:** `backend/database.sql`

### 1.2 Key Components Overview

| Layer            | Component             | Location                                      | Role                                   |
| ---------------- | --------------------- | --------------------------------------------- | -------------------------------------- |
| **Backend**      | Post Controller       | `backend/src/modules/post/post.controller.ts` | Admin message creation endpoints       |
| **Backend**      | Post Service          | `backend/src/modules/post/post.service.ts`    | Business logic - student/group linking |
| **Backend**      | Post Repository       | `backend/src/modules/post/post.repository.ts` | Database CRUD operations               |
| **Backend**      | Message Helper        | `backend/src/utils/messageHelper.ts`          | Parent sync logic                      |
| **Notification** | Push Service          | `push-notification/src/services/`             | Multi-channel notification routing     |
| **Mobile**       | Notifications Utils   | `mobile-frontend/utils/notifications.ts`      | Push token registration & handlers     |
| **Mobile**       | Database Queries      | `mobile-frontend/utils/queries.ts`            | Local SQLite message storage           |
| **Mobile**       | MessageList Component | `mobile-frontend/components/MessageList.tsx`  | Message display UI                     |

---

## 2. MESSAGE SEND FLOW ANALYSIS

### 2.1 Admin → Backend → Database Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: ADMIN SENDS MESSAGE                                      │
└──────────────────────────────────────────────────────────────────┘

POST /admin-panel/post/create
Body: {
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high',
  images: File[],
  students: number[],          // Selected student IDs
  groups: number[]             // Selected group IDs
}

Authenticator: Bearer token (Admin)
Location: backend/src/modules/post/post.controller.ts:createPost()


┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: POST CONTROLLER - REQUEST VALIDATION                     │
└──────────────────────────────────────────────────────────────────┘

File: backend/src/modules/post/post.controller.ts

Flow:
1. Validate admin authorization (Bearer token)
2. Validate request body (title, description, priority, targets)
3. Handle image upload if provided:
   - POST /admin-panel/post/image endpoint
   - Uploads to S3
   - Returns image URL
4. Call PostService.createPost()


┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: POST SERVICE - BUSINESS LOGIC                            │
└──────────────────────────────────────────────────────────────────┘

File: backend/src/modules/post/post.service.ts

Method: createPost(adminId, schoolId, postData)

Flow:
1. Create Post record:
   INSERT INTO Post (title, description, priority, image, admin_id, school_id, sent_at)

2. Find target students:
   - Direct students: students[] array
   - Group students: StudentGroup.students for each groups[] ID
   - Combine & deduplicate

3. Create PostStudent entries:
   FOR EACH student IN target_students:
     INSERT INTO PostStudent (post_id, student_id, group_id)

4. Create PostParent entries (via messageHelper):
   FOR EACH post_student IN PostStudent:
     FOR EACH parent IN StudentParent WHERE student_id = post_student.student_id:
       INSERT INTO PostParent (post_student_id, parent_id, viewed_at, push)
       VALUES (post_student.id, parent.id, NULL, 1)  -- push=1 means pending

5. Return Post object with nested relationships


┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: DATABASE STATE                                           │
└──────────────────────────────────────────────────────────────────┘

After message creation, database contains:

POST table:
  id=1, title='Math Homework', priority='medium', admin_id=5, sent_at=NOW()

POSTSTUDENT table (link post to students):
  id=1, post_id=1, student_id=101, group_id=NULL
  id=2, post_id=1, student_id=102, group_id=NULL

POSTPARENT table (track which parents need notification):
  id=1, post_student_id=1, parent_id=201, push=1 ← Parent of student 101
  id=2, post_student_id=1, parent_id=202, push=1 ← 2nd parent of student 101
  id=3, post_student_id=2, parent_id=301, push=1 ← Parent of student 102

PARENT table:
  id=201, cognito_sub_id='...', arn='ExponentPushToken[abc123...]', school_id=1
```

### 2.2 API Endpoints Map

```
ADMIN MESSAGE CREATION:
└── POST /admin-panel/post/create
    ├── Input: { title, description, priority, students[], groups[], images[] }
    ├── Authentication: Bearer token (Admin)
    ├── Response: { id, title, description, priority, image, admin_id, sent_at }
    └── Database Changes: Post, PostStudent, PostParent records created

└── POST /admin-panel/post/image
    ├── Input: FormData { file: File }
    ├── Response: { imageUrl: string }
    └── Side Effect: Upload to S3

MESSAGE MANAGEMENT:
└── GET /admin-panel/post/list
    └── Response: Post[] with counts

└── GET /admin-panel/post/:id
    └── Response: Full post with relationships

└── PUT /admin-panel/post/:id
    └── Update post details

└── DELETE /admin-panel/post/:id
    └── Soft/hard delete with cascade cleanup

RETRY/RESEND:
└── POST /admin-panel/post/:id/groups/:group_id/retry
    └── Resend notification to group members

└── POST /admin-panel/post/:id/students/:student_id/retry
    └── Resend to specific student & parents

└── POST /admin-panel/post/:id/parents/:parent_id/retry
    └── Resend to specific parent
```

### 2.3 Key Service Methods

**File:** `backend/src/modules/post/post.service.ts`

```typescript
// Main creation handler
async createPost(
  adminId: number,
  schoolId: number,
  {
    title: string,
    description: string,
    priority: 'low' | 'medium' | 'high',
    imageUrl?: string,
    studentIds: number[],
    groupIds: number[]
  }
): Promise<Post> {
  // 1. Create Post record
  // 2. Find all target students (direct + from groups)
  // 3. Create PostStudent entries
  // 4. Call messageHelper.syncNewPostToParents()
  // 5. Return Post with relationships
}

// Called by messageHelper to create PostParent entries
async createPostParentEntries(
  postStudentId: number
): Promise<PostParent[]> {
  // Get student from PostStudent
  // Find all parents of student via StudentParent
  // Create PostParent entries with push=1
}
```

---

## 3. PARENT MOBILE NOTIFICATION ANALYSIS

### 3.1 Push Token Registration & Storage

```
┌────────────────────────────────────────────────────────────────┐
│ PHASE 1: MOBILE APP INITIALIZATION                             │
└────────────────────────────────────────────────────────────────┘

File: mobile-frontend/utils/notifications.ts
Function: initPushNotifications()

STEP 1: Request Permissions
  iOS: Notifications.requestPermissionsAsync()
  Android: Automatic (no request needed in Expo)

STEP 2: Create Android Channels
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: 4,  // MAX
    vibrationPattern: [0, 250, 250, 250],
  })
  // Channels: default, high-priority, critical

STEP 3: Get Expo Push Token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId
  })

  Token format: 'ExponentPushToken[a1b2c3d4e5f6g7h8...]'
  ⭐ STORED IN: AsyncStorage (client-side)

STEP 4: Send to Backend
  POST /mobile/device-token
  Body: { pushToken: 'ExponentPushToken[...]' }
  Authorization: Bearer token (Parent auth)

  ⭐ STORED IN: Parent.arn column (database)

STEP 5: Setup Listeners
  a) notificationReceived$ = new Observable()
     Triggered when notification arrives while app is open

  b) notificationResponseReceived$ = new Observable()
     Triggered when user taps notification

  c) pushTokenListener (device token refresh)
     Expo SDK may refresh token
     When refreshed → reupload to backend
```

**Location:** `mobile-frontend/utils/notifications.ts` (250+ lines of implementation)

### 3.2 Push Token Endpoint Details

```
ENDPOINT: POST /mobile/device-token
Location: backend/src/modules/mobile/auth/auth.controller.ts (line 581)
Authentication: Bearer token

REQUEST:
{
  pushToken: "ExponentPushToken[a1b2c3d4e5f6...]"
}

BACKEND PROCESSING:
1. Extract parent from Bearer token (Cognito sub)
2. Find Parent record in database
3. Normalize token:
   - Trim whitespace
   - Validate format (starts with ExponentPushToken or arn:aws:sns:...)
   - Reject if invalid
4. UPDATE Parent SET arn = pushToken WHERE id = ?
5. Return success response

RESPONSE:
{
  message: "Device token updated successfully",
  parent_id: 1,
  arn: "ExponentPushToken[...]"
}

⭐ ERROR HANDLING:
- Invalid token format: 400 Bad Request
- Parent not found: 404 Not Found
- Database error: 500 Internal Server Error
```

### 3.3 Push Notification Service Flow

```
┌────────────────────────────────────────────────────────────────┐
│ PHASE 2: BACKGROUND NOTIFICATION SERVICE                       │
└────────────────────────────────────────────────────────────────┘

Service: push-notification module
Main Handler: push-notification/src/handlers/notifications/push-notifications.ts

TRIGGER: Periodic or event-driven (likely runs every few minutes)

PROCESS:

1. QUERY PENDING NOTIFICATIONS
   SELECT p.*, ps.*, post.*, parent.arn, parent.phone_number
   FROM PostParent p
   JOIN PostStudent ps ON p.post_student_id = ps.id
   JOIN Post post ON ps.post_id = post.id
   JOIN Parent parent ON p.parent_id = parent.id
   WHERE p.push = 1 AND parent.arn IS NOT NULL

2. SEPARATE BY TOKEN TYPE
   File: push-notification/src/utils/token-detection.ts

   FOR EACH parent ARN:
     if (arn.includes('ExponentPushToken')) {
       TYPE = 'EXPO'
       SERVICE = ExpoPushService
     } else if (arn.startsWith('arn:aws:sns:')) {
       TYPE = 'AWS_PINPOINT'
       SERVICE = PinpointService
     } else if (arn starts with phone format) {
       TYPE = 'SMS'
       SERVICE = SMSService
     }

3. ROUTE TO APPROPRIATE SERVICE

   ┌─ EXPO PUSH SERVICE ─────────────────────┐
   │ File: push-notification/src/services/expo/push.ts
   │ Uses: expo-server-sdk (ExpoPushClient)
   │ Sends: HTTP to Expo Push Notification Service
   │ Handles: Expo tokens like ExponentPushToken[...]
   │ Supports: Foreground + background notifications
   └─────────────────────────────────────────┘

   ┌─ AWS PINPOINT SERVICE ──────────────────┐
   │ File: push-notification/src/services/aws/pinpoint.ts
   │ Uses: AWS SDK for Pinpoint
   │ Sends: To native iOS/Android apps
   │ Handles: ARN tokens from AWS SNS
   │ Supports: Silent notifications
   └─────────────────────────────────────────┘

   ┌─ SMS SERVICE ───────────────────────────┐
   │ File: push-notification/src/services/aws/sms.ts
   │ Providers: PlayMobile (primary), AWS SMS (fallback)
   │ Sends: SMS via POST to PlayMobile API
   │ Includes: Deep link to app (jduapp://student/{id}/message/{id})
   └─────────────────────────────────────────┘

   ┌─ TELEGRAM SERVICE ──────────────────────┐
   │ Optional: Telegram bot notifications
   └─────────────────────────────────────────┘

4. SMS DECISION LOGIC
   IF priority = 'high' OR priority = 'medium':
     AND School.sms_enabled_for_{priority} = true:
     AND Parent.phone_number IS NOT NULL:
       SEND SMS + PUSH

5. NOTIFICATION PAYLOAD

   FOR EXPO/PINPOINT:
   {
     to: parent.arn,
     sound: 'default',
     title: post.title,
     body: post.description,
     data: {
       postId: post.id,
       postStudentId: ps.id,
       priority: post.priority,
       type: 'POST_MESSAGE'
     },
     badge: 1,  // iOS badge
     ttl: 3600  // 1 hour expiry
   }

6. MARK AS SENT
   ON SUCCESS:
     UPDATE PostParent SET push = 0 WHERE id = ?

   ON FAILURE (optional retry):
     Log error, keep push = 1 for next run

7. ERROR HANDLING
   - Expired/invalid token: mark push = 0 (don't retry)
   - Rate limit: retry later
   - Temporary failure: keep push = 1 (will retry)
```

### 3.4 Notification Reception in Mobile App

```
┌────────────────────────────────────────────────────────────────┐
│ PHASE 3: MOBILE APP RECEIVES NOTIFICATION                      │
└────────────────────────────────────────────────────────────────┘

File: mobile-frontend/app/AppWithNotifications.tsx
Main File: mobile-frontend/app/_layout.tsx

EVENT 1: NOTIFICATION RECEIVED (while app open)
  Listener: addNotificationReceivedListener()

  Behavior:
    if (Platform.OS === 'android') {
      // Android shows notification anyway
      showNotificationUI()
    } else if (Platform.OS === 'ios') {
      // iOS: Check shouldShowAlert flag
      if (notification.request.trigger.shouldShowAlert) {
        showNotificationBanner()
      } else {
        silentlyProcess()
      }
    }

EVENT 2: NOTIFICATION TAPPED BY USER
  Listener: addNotificationResponseReceivedListener()

  Data from notification.notification.request.content.data:
    postId, postStudentId, priority

  Action: Navigate to message detail screen
    navigation.navigate('MessageDetail', { postId, postStudentId })

EVENT 3: PUSH TOKEN REFRESHED
  Listener: addPushTokenListener()

  When: Expo SDK refreshes token (expiry/rotation)
  Action: Send new token to backend again
    POST /mobile/device-token with new token
```

---

## 4. PARENT HOME PAGE MESSAGE FLOW

### 4.1 Message Display Architecture

```
┌────────────────────────────────────────────────────────────────┐
│ LOCAL DATABASE: SQLite (Mobile Client)                         │
└────────────────────────────────────────────────────────────────┘

File: mobile-frontend/utils/server.ts (SQLite initialization)

TABLE: message
Columns:
  id (INTEGER PRIMARY KEY),
  student_number (TEXT),
  student_id (INTEGER),
  title (TEXT),
  content (TEXT),
  priority (TEXT),           -- 'low', 'medium', 'high'
  group_name (TEXT),
  edited_at (DATETIME),
  images (TEXT),             -- JSON array of image URLs
  sent_time (DATETIME),
  read_status (INTEGER),     -- 0 = unread, 1 = read
  read_time (DATETIME),
  sent_status (INTEGER),     -- Sync status
  came_time (DATETIME)       -- When notification arrived

STORAGE LOCATION: Local device (encrypted)
PURPOSE: Offline access, fast load, reduced API calls

Index: CREATE INDEX idx_message_student_id ON message(student_id)
       CREATE INDEX idx_message_read_status ON message(read_status)


┌────────────────────────────────────────────────────────────────┐
│ MESSAGE FETCH FLOW: Backend → SQLite → UI                      │
└────────────────────────────────────────────────────────────────┘

STEP 1: API CALL (First load or pull-to-refresh)
Location: mobile-frontend/utils/queries.ts - fetchMessagesFromDB()

Request: GET /mobile/{studentId}/messages?limit=50&offset=0
Auth: Bearer token (Parent)

Backend Response:
{
  messages: [
    {
      id: 1,
      post_id: 1,
      title: "Math Homework",
      description: "Please complete page 5",
      priority: "medium",
      image: "https://s3.../image.jpg",
      student_id: 101,
      student_number: "STU001",
      sent_at: "2024-01-15T10:00:00Z",
      viewed_at: null,  -- null = not viewed
      created_at: "2024-01-15T10:00:00Z"
    }
  ],
  total: 150,
  hasMore: true
}

STEP 2: SAVE TO LOCAL DATABASE
Location: mobile-frontend/utils/queries.ts - saveMessagesToDB()

INSERT INTO message (
  student_number, student_id, title, content, priority,
  group_name, edited_at, images, sent_time, read_status, came_time
) VALUES (...)

Multiple messages inserted in batch for performance


STEP 3: RENDER MESSAGE LIST
Location: mobile-frontend/components/MessageList.tsx

Component Structure:
  <MessageList>
    {messages.map(msg => (
      <MessageCard key={msg.id} message={msg} />
    ))}
  </MessageList>

MessageCard shows:
  - Student number/name
  - Message title (bold)
  - Preview text (truncated)
  - Priority indicator (color badge)
  - Timestamp
  - Unread badge (if read_status = 0)
  - Click → Navigate to detail screen

STEP 4: MESSAGE DETAIL VIEW
Location: mobile-frontend/components/MessageDetail.tsx

On message tap:
  1. Fetch full message content from backend
  2. Display title, full description, image
  3. Mark as read: POST /mobile/{studentId}/message/{messageId}/read
  4. Update local DB: UPDATE message SET read_status = 1, read_time = NOW()
  5. Sync read status back to backend


┌────────────────────────────────────────────────────────────────┐
│ MESSAGE QUERYING & FILTERING                                   │
└────────────────────────────────────────────────────────────────┘

FILTERS:
1. By student: WHERE student_id = ?
2. By read status: WHERE read_status = ? (unread/read)
3. By priority: WHERE priority = ? (low/medium/high)
4. By time range: WHERE sent_time BETWEEN ? AND ?

SORTING:
  ORDER BY sent_time DESC (newest first)
  ORDER BY read_status ASC, sent_time DESC (unread first)

PAGINATION:
  LIMIT 50 OFFSET (page * 50)
  hasMore = total > offset + limit

INFINITE SCROLL:
  <FlashList>
    onEndReached={() => fetchNextPage()}
  </FlashList>
  Triggers fetchMessagesFromDB(page + 1)


┌────────────────────────────────────────────────────────────────┐
│ REAL-TIME vs POLLING                                           │
└────────────────────────────────────────────────────────────────┘

Current Implementation: POLLING + PUSH NOTIFICATIONS

POLLING:
  - Pull-to-refresh: Manual refresh button
  - Periodic check: useEffect with timer (optional)
  - On app resume: Check for new messages

PUSH NOTIFICATIONS:
  - Primary mechanism for new message arrival
  - Notification.data contains postId
  - Auto-fetch new message on notification tap
  - Badge count updated

ADVANTAGES:
  ✅ Simple to implement
  ✅ No WebSocket complexity
  ✅ Works offline
  ✅ Push provides real-time feel

DISADVANTAGES:
  ❌ Slight delay from message creation to notification
  ❌ Network dependent
  ❌ May miss notifications (device offline)


┌────────────────────────────────────────────────────────────────┐
│ UNREAD/READ SYSTEM                                             │
└────────────────────────────────────────────────────────────────┘

Database Column: read_status (0 = unread, 1 = read)
Backend Column: PostParent.viewed_at (DATETIME or NULL)

FLOW:
1. Message created → PostParent.viewed_at = NULL
2. Parent receives push notification
3. Parent opens message detail
4. POST /mobile/{studentId}/message/{messageId}/read
5. Backend: UPDATE PostParent SET viewed_at = NOW()
6. Client: UPDATE message SET read_status = 1, read_time = NOW()

UNREAD COUNT:
  SELECT COUNT(*) FROM message WHERE read_status = 0
  Displayed as badge on home tab

AUTO-MARK-READ:
  Message marked read when:
    - User opens message detail screen
    - Explicit read button tap
    - NOT on list scroll (RN best practice)
```

---

## 5. STUDENT VERSION IMPLEMENTATION PLAN

### 5.1 Architecture Overview

```
🎯 STUDENT NOTIFICATION FLOW:

Admin selects students → Creates post → Backend creates StudentMessage entry
                                            ↓
                                    Student token (push service)
                                            ↓
                                    Expo/AWS sends push to student app
                                            ↓
                                    Student app receives notification
                                            ↓
                                    Stored in local SQLite database
                                            ↓
                                    Displayed in student home page inbox
                                            ↓
                                    Read/unread tracking

📊 KEY DIFFERENCE FROM PARENT:
  Parent:        Post → PostStudent → PostParent (one per parent per student)
  Student:       Post → StudentMessage (direct, one per student) ⭐
                 NO intermediate parent mapping needed
```

### 5.2 Database Schema - New Tables

```sql
-- NEW TABLE: Student device tokens
CREATE TABLE StudentNotificationToken (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  arn TEXT NOT NULL,                     -- Expo or AWS push token
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  INDEX idx_student_arn (student_id, arn)
);

-- NEW TABLE: Student messages (direct notification tracking)
CREATE TABLE StudentMessage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  student_id INT NOT NULL,
  push TINYINT(1) DEFAULT 1,            -- 1=pending, 0=sent
  viewed_at DATETIME,                    -- When student viewed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES Post(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  UNIQUE KEY (post_id, student_id),
  INDEX idx_student_message_push (student_id, push),
  INDEX idx_student_message_view (student_id, viewed_at)
);

-- MODIFY: Add student reference to Post (optional, for direct message type)
ALTER TABLE Post ADD COLUMN message_type ENUM('parent', 'student', 'both')
  DEFAULT 'parent';

-- NO SMS SERVICE NEEDED - No StudentPhone equivalent required
```

### 5.3 Implementation Phases

#### PHASE 1: Backend API Changes (2-3 days)

**1.1 New Endpoints**

```
POST /mobile/student/device-token
├── Purpose: Store student push token
├── Auth: Bearer token (Student)
├── Request: { pushToken: "ExponentPushToken[...]" }
├── Response: { message: "Token stored", student_id: 1 }
├── Storage: StudentNotificationToken.arn
└── Implementation: ~50 lines

GET /mobile/student/messages
├── Purpose: Fetch all messages for student
├── Auth: Bearer token (Student)
├── Query Params: ?limit=50&offset=0
├── Response:
│   {
│     messages: [
│       {
│         id, post_id, title, description, priority,
│         image, sent_at, viewed_at, created_at
│       }
│     ],
│     total, hasMore
│   }
├── Database: Query StudentMessage + join Post
└── Implementation: ~80 lines

POST /mobile/student/message/:messageId/read
├── Purpose: Mark message as read
├── Auth: Bearer token (Student)
├── Response: { message: "Message marked as read" }
├── Database: UPDATE StudentMessage SET viewed_at = NOW()
└── Implementation: ~40 lines
```

**1.2 Modify Admin Message Creation**

File: `backend/src/modules/post/post.controller.ts`
File: `backend/src/modules/post/post.service.ts`

Current logic:

```typescript
// Current - only creates for parents
createPost(adminId, postData) {
  const post = await repo.createPost(postData);

  // Get target students
  const students = await getTargetStudents(postData);

  // Create PostStudent entries
  for (const student of students) {
    await repo.createPostStudent(post.id, student.id);
  }

  // Create PostParent for each parent
  await messageHelper.syncNewPostToParents(post.id);
}
```

New logic:

```typescript
// New - create for both parents AND students
createPost(adminId, postData) {
  const post = await repo.createPost(postData);

  const students = await getTargetStudents(postData);

  for (const student of students) {
    await repo.createPostStudent(post.id, student.id);
  }

  // EXISTING: Parents
  if (postData.messageType !== 'student') {
    await messageHelper.syncNewPostToParents(post.id);
  }

  // NEW: Students
  if (postData.messageType !== 'parent') {
    await this.syncNewPostToStudents(post.id);  // ← NEW METHOD
  }
}

// NEW METHOD to create StudentMessage entries
async syncNewPostToStudents(postId: number) {
  const post = await repo.getPost(postId);

  // Get students via PostStudent
  const students = await repo.getStudentsForPost(postId);

  for (const student of students) {
    await repo.createStudentMessage({
      post_id: postId,
      student_id: student.id,
      push: 1  // Mark for notification
    });
  }
}
```

**1.3 New Service Files**

File: `backend/src/modules/student-notification/student-notification.service.ts`

```typescript
export class StudentNotificationService {
  // Store/update student device token
  async saveStudentToken(studentId: number, token: string): Promise<void>;

  // Get all pending student messages
  async getPendingMessages(studentId: number): Promise<StudentMessage[]>;

  // Get paginated messages
  async getMessages(studentId: number, limit: number, offset: number);

  // Mark message as read
  async markMessageAsRead(messageId: number, studentId: number): Promise<void>;

  // Get unread count
  async getUnreadCount(studentId: number): Promise<number>;
}
```

File: `backend/src/modules/student-notification/student-notification.repository.ts`

```typescript
export class StudentNotificationRepository {
  // Student token CRUD
  createOrUpdateToken(studentId, token);
  getToken(studentId);
  deleteToken(studentId);

  // StudentMessage CRUD
  createStudentMessage(postId, studentId);
  getStudentMessages(studentId, limit, offset);
  getStudentMessageById(messageId, studentId);
  markAsRead(messageId, studentId);
  getUnreadCount(studentId);

  // Batch operations
  createStudentMessagesForPost(postId); // For all students in PostStudent
  getPendingStudentMessages(); // For push notification processor
}
```

**Time Estimate: 2-3 days**

#### PHASE 2: Push Notification Service Changes (1 day)

File: `push-notification/src/handlers/notifications/student-push-notifications.ts` (NEW)

```typescript
export async function processStudentNotifications() {
  // Similar to parent notifications but:

  // 1. Query StudentMessage with push=1
  const pendingMessages = await db.query(`
    SELECT sm.*, s.id as student_id, snt.arn as token, 
           p.title, p.description, p.priority, p.image
    FROM StudentMessage sm
    JOIN Student s ON sm.student_id = s.id
    JOIN StudentNotificationToken snt ON s.id = snt.student_id
    JOIN Post p ON sm.post_id = p.id
    WHERE sm.push = 1 AND snt.arn IS NOT NULL
  `);

  // 2. Route to appropriate service (Expo/AWS)
  for (const msg of pendingMessages) {
    const tokenType = detectTokenType(msg.token);

    const payload = {
      to: msg.token,
      sound: "default",
      title: msg.title,
      body: msg.description,
      data: {
        messageId: msg.id,
        postId: msg.post_id,
        type: "STUDENT_MESSAGE",
      },
    };

    try {
      if (tokenType.isExpoToken) {
        await expoPushService.send(payload);
      } else {
        await pinpointService.send(payload);
      }

      // Mark as sent
      await db.query(
        `
        UPDATE StudentMessage SET push = 0 WHERE id = ?
      `,
        [msg.id],
      );
    } catch (error) {
      logger.error(`Failed to send student notification: ${error}`);
      // Keep push=1, will retry next run
    }
  }
}
```

Integrate into main notification scheduler:

```typescript
// File: push-notification/src/index.ts
async function processAllNotifications() {
  await processParentNotifications(); // Existing
  await processStudentNotifications(); // NEW
  // ... other services
}
```

**Time Estimate: 1 day**

#### PHASE 3: Mobile Student App Changes (3-5 days)

**3.1 Push Token Registration**

File: `mobile-students/utils/notifications.ts` (NEW)

```typescript
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export async function initStudentPushNotifications() {
  // 1. Request permissions
  await Notifications.requestPermissionsAsync();

  // 2. Create Android channels
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // 3. Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  // 4. Save to AsyncStorage
  await AsyncStorage.setItem("studentPushToken", token);

  // 5. Send to backend
  await sendTokenToBackend(token);

  // 6. Setup listeners
  setupNotificationListeners();
}

async function sendTokenToBackend(token: string) {
  const authToken = await AsyncStorage.getItem("authToken");

  try {
    const response = await fetch(
      `${API_BASE_URL}/mobile/student/device-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken: token }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to save token: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error sending push token:", error);
    // Retry logic in app lifecycle
  }
}

function setupNotificationListeners() {
  // Notification received while app open
  Notifications.addNotificationReceivedListener((notification) => {
    handleNotificationReceived(notification);
  });

  // User taps notification
  Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response);
  });

  // Token refresh
  Notifications.addPushTokenListener((event) => {
    sendTokenToBackend(event.pushToken);
  });
}

function handleNotificationReceived(notification: Notifications.Notification) {
  // Handle foreground notification
  console.log("Notification received:", notification);
  // Trigger local update of message list
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const { postId, messageId } = response.notification.request.content.data;

  // Navigate to message detail
  navigationRef.navigate("MessageDetail", {
    messageId,
    postId,
  });
}
```

**3.2 Home Page Message Display**

File: `mobile-students/app/(tabs)/index.tsx` (MODIFY)

```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import MessageCard from '@/components/MessageCard';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';

export default function HomeScreen() {
  const { student } = useAuth();
  const { messages, loading, refreshMessages, loadMoreMessages, hasMore } =
    useMessages();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Fetch initial messages
    refreshMessages();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshMessages();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMoreMessages();
    }
  };

  if (loading && messages.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => <MessageCard message={item} />}
      keyExtractor={(item) => item.id.toString()}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={<EmptyMessagesList />}
      contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12 }}
    />
  );
}

function EmptyMessagesList() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 16, color: '#999' }}>
        No messages yet
      </Text>
    </View>
  );
}
```

**3.3 Message List Component**

File: `mobile-students/components/MessageCard.tsx` (NEW)

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '@/utils/date';
import { getPriorityColor, getPriorityLabel } from '@/utils/priority';

interface Message {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  sent_at: string;
  viewed_at?: string;
  image?: string;
}

export default function MessageCard({ message }: { message: Message }) {
  const router = useRouter();
  const isUnread = !message.viewed_at;
  const priorityColor = getPriorityColor(message.priority);

  const handlePress = () => {
    router.push({
      pathname: '/message/[id]',
      params: { id: message.id }
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.unreadCard]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text
            style={[styles.title, isUnread && styles.unreadTitle]}
            numberOfLines={2}
          >
            {message.title}
          </Text>
          {isUnread && <View style={styles.unreadBadge} />}
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: priorityColor }
          ]}
        >
          <Text style={styles.priorityText}>
            {getPriorityLabel(message.priority)}
          </Text>
        </View>
      </View>

      <Text
        style={styles.description}
        numberOfLines={2}
      >
        {message.description}
      </Text>

      <Text style={styles.timestamp}>
        {formatDate(message.sent_at)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unreadCard: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#007AFF',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
});
```

**3.4 Message Context Hook**

File: `mobile-students/hooks/useMessages.ts` (NEW)

```typescript
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as messageService from "@/services/messageService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useMessages() {
  const { authToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const LIMIT = 50;

  const refreshMessages = async () => {
    setLoading(true);
    setOffset(0);

    try {
      const data = await messageService.fetchMessages(authToken, 0, LIMIT);
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    const nextOffset = offset + LIMIT;

    try {
      const data = await messageService.fetchMessages(
        authToken,
        nextOffset,
        LIMIT,
      );

      setMessages((prev) => [...prev, ...data.messages]);
      setOffset(nextOffset);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error loading more messages:", error);
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      await messageService.markMessageAsRead(authToken, messageId);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, viewed_at: new Date().toISOString() }
            : msg,
        ),
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  return {
    messages,
    loading,
    hasMore,
    refreshMessages,
    loadMoreMessages,
    markMessageAsRead,
  };
}
```

**3.5 Message Service**

File: `mobile-students/services/messageService.ts` (NEW)

```typescript
import { API_BASE_URL } from "@/constants/config";

export async function fetchMessages(
  authToken: string,
  offset: number,
  limit: number,
) {
  const response = await fetch(
    `${API_BASE_URL}/mobile/student/messages?offset=${offset}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    messages: data.messages,
    total: data.total,
    hasMore: data.offset + data.limit < data.total,
  };
}

export async function markMessageAsRead(authToken: string, messageId: number) {
  const response = await fetch(
    `${API_BASE_URL}/mobile/student/message/${messageId}/read`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to mark message as read: ${response.statusText}`);
  }

  return response.json();
}

export async function saveStudentToken(authToken: string, pushToken: string) {
  const response = await fetch(`${API_BASE_URL}/mobile/student/device-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ pushToken }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save device token: ${response.statusText}`);
  }

  return response.json();
}
```

**3.6 App Layout Integration**

File: `mobile-students/app/_layout.tsx` (MODIFY)

```typescript
import { useEffect } from 'react';
import { initStudentPushNotifications } from '@/utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Initialize push notifications
    initStudentPushNotifications().catch(error => {
      console.error('Failed to initialize push notifications:', error);
    });
  }, []);

  return (
    // ... existing layout
  );
}
```

**Time Estimate: 3-5 days**

---

## 6. REQUIRED BACKEND CHANGES

### 6.1 Database Migration

**File:** `backend/database.sql` (ADD NEW TABLES)

```sql
-- Run this migration

-- Table 1: Student device tokens
CREATE TABLE IF NOT EXISTS StudentNotificationToken (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL UNIQUE,
  arn TEXT NOT NULL COMMENT 'Device token (Expo or AWS)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  KEY idx_student_arn (student_id, arn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Student messages with notification tracking
CREATE TABLE IF NOT EXISTS StudentMessage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  student_id INT NOT NULL,
  push TINYINT(1) DEFAULT 1 COMMENT '0=sent, 1=pending',
  viewed_at DATETIME COMMENT 'When student viewed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES Post(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
  UNIQUE KEY (post_id, student_id),
  KEY idx_student_message_push (student_id, push),
  KEY idx_student_message_view (student_id, viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add message_type column to Post
ALTER TABLE Post ADD COLUMN IF NOT EXISTS message_type
  ENUM('parent', 'student', 'both') DEFAULT 'parent' COMMENT 'Who receives this message';
```

### 6.2 New Modules & Files

**Module Structure:**

```
backend/src/modules/
├── student-notification/              [NEW]
│   ├── student-notification.controller.ts
│   ├── student-notification.service.ts
│   ├── student-notification.repository.ts
│   ├── dto/
│   │   ├── save-student-token.dto.ts
│   │   └── get-messages.dto.ts
│   └── student-notification.module.ts
└── post/                              [EXISTING - MODIFY]
    ├── post.controller.ts             [UPDATE]
    ├── post.service.ts                [UPDATE]
    └── post.repository.ts             [UPDATE]
```

### 6.3 Endpoints Implementation

**Controller:** `backend/src/modules/student-notification/student-notification.controller.ts`

```typescript
import { Controller, Post, Get, Body, UseGuards, Query } from "@nestjs/common";
import { JwtGuard } from "@/guards/jwt.guard";
import { GetUser } from "@/decorators/get-user.decorator";
import { StudentNotificationService } from "./student-notification.service";
import { SaveStudentTokenDto } from "./dto/save-student-token.dto";

@Controller("mobile/student")
export class StudentNotificationController {
  constructor(
    private readonly notificationService: StudentNotificationService,
  ) {}

  @Post("device-token")
  @UseGuards(JwtGuard)
  async saveDeviceToken(
    @GetUser() user: any,
    @Body() dto: SaveStudentTokenDto,
  ) {
    const studentId = user.studentId; // From JWT

    if (!studentId) {
      throw new Error("Unauthorized: Not a student account");
    }

    await this.notificationService.saveStudentToken(studentId, dto.pushToken);

    return {
      message: "Device token stored successfully",
      student_id: studentId,
      arn: dto.pushToken,
    };
  }

  @Get("messages")
  @UseGuards(JwtGuard)
  async getMessages(
    @GetUser() user: any,
    @Query("limit") limit: number = 50,
    @Query("offset") offset: number = 0,
  ) {
    const studentId = user.studentId;

    if (!studentId) {
      throw new Error("Unauthorized: Not a student account");
    }

    const { messages, total } = await this.notificationService.getMessages(
      studentId,
      limit,
      offset,
    );

    return {
      messages,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  }

  @Post("message/:messageId/read")
  @UseGuards(JwtGuard)
  async markMessageAsRead(
    @GetUser() user: any,
    @Param("messageId") messageId: number,
  ) {
    const studentId = user.studentId;

    if (!studentId) {
      throw new Error("Unauthorized: Not a student account");
    }

    await this.notificationService.markMessageAsRead(messageId, studentId);

    return { message: "Message marked as read" };
  }
}
```

**Service:** `backend/src/modules/student-notification/student-notification.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { StudentNotificationRepository } from "./student-notification.repository";
import { validatePushToken } from "@/utils/token-validation";

@Injectable()
export class StudentNotificationService {
  constructor(private readonly repository: StudentNotificationRepository) {}

  async saveStudentToken(studentId: number, token: string): Promise<void> {
    // Validate token format
    if (!validatePushToken(token)) {
      throw new Error("Invalid push token format");
    }

    // Normalize token (trim)
    const normalizedToken = token.trim();

    // Save to database
    await this.repository.createOrUpdateToken(studentId, normalizedToken);
  }

  async getMessages(
    studentId: number,
    limit: number,
    offset: number,
  ): Promise<{ messages: any[]; total: number }> {
    const messages = await this.repository.getStudentMessages(
      studentId,
      limit,
      offset,
    );

    const total = await this.repository.getStudentMessageCount(studentId);

    return { messages, total };
  }

  async markMessageAsRead(messageId: number, studentId: number): Promise<void> {
    // Verify message belongs to student
    const message = await this.repository.getStudentMessageById(
      messageId,
      studentId,
    );

    if (!message) {
      throw new Error("Message not found");
    }

    // Mark as read
    await this.repository.markAsRead(messageId);
  }

  async getUnreadCount(studentId: number): Promise<number> {
    return this.repository.getUnreadCount(studentId);
  }
}
```

**Repository:** `backend/src/modules/student-notification/student-notification.repository.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class StudentNotificationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createOrUpdateToken(studentId: number, token: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO StudentNotificationToken (student_id, arn)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE arn = ?, updated_at = NOW()`,
      [studentId, token, token],
    );
  }

  async getToken(studentId: number): Promise<string | null> {
    const result = await this.dataSource.query(
      `SELECT arn FROM StudentNotificationToken WHERE student_id = ?`,
      [studentId],
    );
    return result[0]?.arn || null;
  }

  async getStudentMessages(
    studentId: number,
    limit: number,
    offset: number,
  ): Promise<any[]> {
    return this.dataSource.query(
      `SELECT 
        sm.id, sm.post_id, sm.viewed_at,
        p.title, p.description, p.priority, p.image, p.sent_at,
        p.created_at
      FROM StudentMessage sm
      JOIN Post p ON sm.post_id = p.id
      WHERE sm.student_id = ?
      ORDER BY p.sent_at DESC
      LIMIT ? OFFSET ?`,
      [studentId, limit, offset],
    );
  }

  async getStudentMessageCount(studentId: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM StudentMessage WHERE student_id = ?`,
      [studentId],
    );
    return result[0]?.count || 0;
  }

  async getStudentMessageById(
    messageId: number,
    studentId: number,
  ): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT * FROM StudentMessage WHERE id = ? AND student_id = ?`,
      [messageId, studentId],
    );
    return result[0] || null;
  }

  async markAsRead(messageId: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE StudentMessage SET viewed_at = NOW() WHERE id = ?`,
      [messageId],
    );
  }

  async getUnreadCount(studentId: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM StudentMessage 
       WHERE student_id = ? AND viewed_at IS NULL`,
      [studentId],
    );
    return result[0]?.count || 0;
  }

  async createStudentMessage(postId: number, studentId: number): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO StudentMessage (post_id, student_id, push)
         VALUES (?, ?, 1)`,
        [postId, studentId],
      );
    } catch (error) {
      // Duplicate key - already exists, ignore
      if (error.code !== "ER_DUP_ENTRY") {
        throw error;
      }
    }
  }

  async createStudentMessagesForPost(postId: number): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO StudentMessage (post_id, student_id, push)
       SELECT ? as post_id, ps.student_id, 1
       FROM PostStudent ps
       WHERE ps.post_id = ?
       ON DUPLICATE KEY UPDATE push = 1`,
      [postId, postId],
    );
  }

  async getPendingStudentNotifications(): Promise<any[]> {
    return this.dataSource.query(
      `SELECT sm.*, snt.arn as token, p.title, p.description, p.priority, p.image
       FROM StudentMessage sm
       JOIN StudentNotificationToken snt ON sm.student_id = snt.student_id
       JOIN Post p ON sm.post_id = p.id
       WHERE sm.push = 1 AND snt.arn IS NOT NULL
       LIMIT 1000`,
    );
  }

  async markNotificationAsSent(studentMessageId: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE StudentMessage SET push = 0 WHERE id = ?`,
      [studentMessageId],
    );
  }
}
```

### 6.4 Modify Post Service for Student Messages

**File:** `backend/src/modules/post/post.service.ts` (UPDATE)

```typescript
// In createPost method, add:

async createPost(adminId: number, schoolId: number, postData: any) {
  // ... existing code ...

  const post = await this.postRepository.createPost({
    title: postData.title,
    description: postData.description,
    priority: postData.priority,
    image: postData.image,
    admin_id: adminId,
    school_id: schoolId,
    message_type: postData.messageType || 'parent'
  });

  // Get target students
  const students = await this.getTargetStudents(postData);

  for (const student of students) {
    await this.postRepository.createPostStudent(post.id, student.id);
  }

  // EXISTING: Create parent messages
  if (post.message_type !== 'student') {
    await this.messageHelper.syncNewPostToParents(post.id);
  }

  // NEW: Create student messages
  if (post.message_type !== 'parent') {
    await this.studentNotificationRepository.createStudentMessagesForPost(post.id);
  }

  return post;
}
```

### 6.5 Integration in App Module

**File:** `backend/src/app.module.ts` (UPDATE)

```typescript
import { StudentNotificationModule } from "./modules/student-notification/student-notification.module";

@Module({
  imports: [
    // ... existing modules ...
    StudentNotificationModule,
  ],
})
export class AppModule {}
```

**File:** `backend/src/modules/student-notification/student-notification.module.ts` (NEW)

```typescript
import { Module } from "@nestjs/common";
import { StudentNotificationController } from "./student-notification.controller";
import { StudentNotificationService } from "./student-notification.service";
import { StudentNotificationRepository } from "./student-notification.repository";

@Module({
  controllers: [StudentNotificationController],
  providers: [StudentNotificationService, StudentNotificationRepository],
  exports: [StudentNotificationService, StudentNotificationRepository],
})
export class StudentNotificationModule {}
```

---

## 7. REQUIRED MOBILE CHANGES

### 7.1 Directory Structure (mobile-students)

```
mobile-students/
├── app/
│   ├── _layout.tsx                    [MODIFY - init notifications]
│   ├── (tabs)/
│   │   └── index.tsx                  [MODIFY - show messages]
│   ├── message/
│   │   └── [id].tsx                   [NEW - message detail]
│   └── api/
│       └── auth.ts                    [EXISTING]
│
├── components/
│   ├── MessageCard.tsx                [NEW]
│   ├── MessageDetail.tsx              [NEW]
│   └── EmptyMessagesList.tsx          [NEW]
│
├── hooks/
│   └── useMessages.ts                 [NEW]
│
├── services/
│   └── messageService.ts              [NEW]
│
├── utils/
│   ├── notifications.ts               [NEW]
│   ├── date.ts                        [NEW - date formatting]
│   └── priority.ts                    [NEW - priority helpers]
│
├── types/
│   └── message.ts                     [NEW]
│
└── contexts/
    └── AuthContext.tsx                [EXISTING]
```

### 7.2 New Files to Create

All detailed implementations shown in PHASE 3 above:

1. `mobile-students/utils/notifications.ts` - Push token management
2. `mobile-students/hooks/useMessages.ts` - Message state hook
3. `mobile-students/services/messageService.ts` - API calls
4. `mobile-students/components/MessageCard.tsx` - Message list item
5. `mobile-students/components/MessageDetail.tsx` - Message details screen
6. `mobile-students/app/message/[id].tsx` - Message detail route
7. `mobile-students/types/message.ts` - TypeScript interfaces
8. `mobile-students/utils/date.ts` - Date formatting utilities
9. `mobile-students/utils/priority.ts` - Priority badge utilities

### 7.3 Dependencies to Add

**File:** `mobile-students/package.json`

```json
{
  "dependencies": {
    "expo-notifications": "^0.28.0",
    "expo-constants": "~18.0.13",
    "@react-native-async-storage/async-storage": "^1.23.1"
  }
}
```

Run: `npm install`

---

## 8. REUSABLE COMPONENTS & CODE

### 8.1 Code That Can Be Reused

| Component                   | Parent                                   | Student                                  | Reuse Level                        |
| --------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------- |
| **Push Token Registration** | `mobile-frontend/utils/notifications.ts` | `mobile-students/utils/notifications.ts` | 90% identical                      |
| **Notification Listeners**  | AppWithNotifications.tsx                 | Student app                              | 85% identical                      |
| **API Base Service**        | `mobile-frontend/services/api.ts`        | Student services                         | 100% reuse                         |
| **Message Card UI**         | MessageCard.tsx                          | MessageCard.tsx                          | 100% copy (different style system) |
| **Infinite Scroll List**    | MessageList.tsx                          | Home screen                              | 90% reuse                          |
| **Read/Unread Tracking**    | Local SQLite                             | StudentMessage table                     | 95% reuse                          |
| **Date Formatting**         | mobile-frontend/utils                    | mobile-students/utils                    | 100% copy                          |
| **Error Handling**          | API layer                                | API layer                                | 100% reuse                         |

### 8.2 Code to Copy

#### From `mobile-frontend`:

1. **Push Notification Utils** - `mobile-frontend/utils/notifications.ts`
   - Copy 90%, change references from Parent to Student
   - Modify endpoint from `/mobile/parent/device-token` to `/mobile/student/device-token`

2. **API Service Methods** - `mobile-frontend/services/api.ts`
   - Use existing API caller
   - Add new endpoints: `student/messages`, `student/device-token`

3. **Message Card Component** - `mobile-frontend/components/card.tsx`
   - Copy structure, adapt styling to Expo/React Native

4. **Infinite Scroll Pagination** - `mobile-frontend/components/MessageList.tsx`
   - Copy pattern, apply to `mobile-students/app/(tabs)/index.tsx`

#### From `backend`:

1. **Message Service Pattern** - `backend/src/modules/post/post.service.ts`
   - Copy pattern to StudentNotificationService
   - Reuse messageHelper patterns

2. **JWT Guard** - `backend/src/guards/jwt.guard.ts`
   - Reuse existing guard
   - Add student role check in decorator

3. **Error Handling** - Existing error classes
   - Reuse HttpException patterns

### 8.3 Backend Code That Should NOT Be Duplicated

**Existing Parent Infrastructure:**

- ✅ Use `messageHelper.ts` patterns
- ✅ Use `PostRepository` queries
- ✅ Reuse JWT/Auth guards
- ✅ Use existing S3 service for images
- ✅ Reuse database connection
- ✅ Reuse error handling utilities

**What Must Be New:**

- ❌ StudentMessage table operations (separate repository)
- ❌ StudentNotificationToken operations (separate repository)
- ❌ Student message endpoints (new controller)
- ❌ Student notification processor (new handler)

---

## 9. ARCHITECTURE DIAGRAM

### 9.1 System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ADMIN CREATES MESSAGE                               │
│                   (Admin Panel Web App)                                  │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  POST /admin-panel/post/create      │
        │  - title, description, priority     │
        │  - students[], groups[]             │
        │  - message_type: 'parent'|'student' │
        └────────────────────┬────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────┐
            │   Post Service (Backend)            │
            │  - Create Post record               │
            │  - Create PostStudent entries       │
            └────────────┬───────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────────────────┐         ┌──────────────────────┐
    │ Parent Messages     │         │ Student Messages     │
    ├─────────────────────┤         ├──────────────────────┤
    │ Create PostParent   │         │ Create StudentMessage│
    │ entries (one per    │         │ entries (one per     │
    │ parent per student) │         │ student)             │
    │ push = 1            │         │ push = 1             │
    └──────────┬──────────┘         └──────────┬───────────┘
               │                               │
               ▼                               ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Push Notification Service (Background Scheduler)         │
    │  File: push-notification/src/handlers/               │
    ├──────────────────────────────────────────────────────────┤
    │  1. Query pending: PostParent.push = 1 OR StudentMessage │
    │  2. Get tokens: Parent.arn OR StudentNotificationToken   │
    │  3. Detect type: Expo vs AWS                             │
    │  4. Send notifications                                   │
    │  5. Update: push = 0                                     │
    └──────────┬────────────────────────────────┬──────────────┘
               │                                │
    ┌──────────▼────────────────┐    ┌─────────▼─────────────────┐
    │   PARENT MOBILE APP        │    │  STUDENT MOBILE APP       │
    ├────────────────────────────┤    ├───────────────────────────┤
    │ 1. Init push notifications │    │ 1. Init push notifications│
    │ 2. Register Expo token     │    │ 2. Register Expo token    │
    │ 3. POST /mobile/..token    │    │ 3. POST /mobile/..token   │
    │ 4. Store in Parent.arn     │    │ 4. Store in               │
    │                            │    │    StudentNotificationToken
    │ 5. Receive push            │    │ 5. Receive push           │
    │ 6. Fetch messages          │    │ 6. Fetch messages         │
    │ 7. Store in SQLite         │    │ 7. Store in SQLite        │
    │ 8. Display in MessageList  │    │ 8. Display in MessageList │
    │ 9. Mark read on tap        │    │ 9. Mark read on tap       │
    └────────────────────────────┘    └───────────────────────────┘
               │                                │
    ┌──────────▼────────────────┐    ┌─────────▼─────────────────┐
    │  GET /mobile/.../messages  │    │ GET /mobile/student/msgs  │
    │  From backend (API call)   │    │ From backend (API call)   │
    │  Join: PostParent + Post   │    │ Join: StudentMessage+Post │
    └────────────────────────────┘    └───────────────────────────┘
```

### 9.2 Database Relationships

```sql
-- EXISTING PARENT FLOW:
Post → PostStudent → PostParent → Parent (has arn token)

-- NEW STUDENT FLOW:
Post → PostStudent → StudentMessage → Student + StudentNotificationToken

-- MIXED FLOW (if message_type = 'both'):
Post → PostStudent → PostParent → Parent
                  → StudentMessage → StudentNotificationToken

-- Schema Comparison:

PARENT TRACKING:
  Post (1) ─── (many) PostStudent (1) ─── (many) PostParent
           │                         │
           │                         └── (many) Parent
           └── image to S3

STUDENT TRACKING (SIMILAR BUT DIRECT):
  Post (1) ─── (many) PostStudent (1) ─── (many) StudentMessage
       │                         │
       │                         └── (many) Student → StudentNotificationToken
       └── image to S3

KEY DIFFERENCE:
  Parent: Multi-hop (Post→PParent→Parent) because one parent has multiple students
  Student: Direct (Post→StudentMessage→Student) because message targets specific students
```

---

## 10. RISKS & EDGE CASES

### 10.1 Risks

| Risk                             | Impact                                       | Mitigation                                                   |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| **Duplicate Notifications**      | Student gets same message twice              | Unique constraint on (post_id, student_id) in StudentMessage |
| **Token Expiration**             | Notifications fail silently                  | Implement token refresh listener, retry logic                |
| **Network Failure**              | Message not sent to backend                  | Queue failed tokens, retry on app resume                     |
| **Student Deleted**              | Orphaned StudentMessage rows                 | CASCADE DELETE on Student.id                                 |
| **Post Deleted**                 | Orphaned StudentNotificationToken references | CASCADE DELETE on Post.id                                    |
| **Race Condition**               | Race between parent/student message creation | Database constraints + idempotent operations                 |
| **FCM/Expo Outage**              | All notifications fail                       | Add fallback service (SMS for critical messages)             |
| **Student Mobile Not Installed** | Token invalid after reinstall                | Token refresh listener handles this                          |
| **Mixed message_type**           | Admin sends to both parent and student       | Design should handle this cleanly                            |
| **Offline Student**              | Message queued but never fetched             | Notifications expire; user can fetch manually                |

### 10.2 Edge Cases

#### **Case 1: Student with Multiple Tokens**

Problem: Student installs app on 2 devices
Solution: Allow multiple tokens per student

```sql
-- MODIFIED TABLE:
CREATE TABLE StudentNotificationToken (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,  -- Remove UNIQUE
  arn TEXT NOT NULL,
  device_id VARCHAR(255),   -- ADD: Device identifier
  created_at DATETIME,
  KEY idx_student_token (student_id, arn)
);
```

#### **Case 2: Student is Also a Parent**

Problem: Some users have both roles
Solution: Separate token storage

- StudentNotificationToken (for student role)
- Parent.arn (for parent role)
- Each role gets independent notifications

#### **Case 3: Bulk Message Send to 1000+ Students**

Problem: Performance issue creating 1000 StudentMessage rows
Solution: Batch insert

```typescript
async createStudentMessagesForPost(postId: number) {
  const students = await this.getStudentsForPost(postId);

  // Batch insert in chunks of 100
  for (let i = 0; i < students.length; i += 100) {
    const batch = students.slice(i, i + 100);
    await this.batchInsertStudentMessages(postId, batch);
  }
}
```

#### **Case 4: Admin Updates Message After Sending**

Problem: StudentMessage already sent, update doesn't propagate
Solution: Track edit

```sql
ALTER TABLE StudentMessage ADD COLUMN edited_at DATETIME;
-- Admin can decide: update existing or create new message
```

#### **Case 5: Student Logs Out, Token Invalid**

Problem: Token still in DB but student not authenticated
Solution: Lazy validation

```typescript
async processStudentNotifications() {
  for (const notification of pending) {
    try {
      await sendNotification(notification);
    } catch (error) {
      if (error.isInvalidToken) {
        await deleteToken(notification.student_id);  // Clean up
      }
    }
  }
}
```

#### **Case 6: Message with Images - Slow Load**

Problem: Image upload/S3 sync takes time
Solution: Async image processing

```typescript
createPost() {
  const post = await this.postRepository.createPost(postData);
  // Don't wait for image upload

  // Create messages immediately
  await this.createStudentMessages(post.id);

  // Process image in background
  this.imageService.processAndUpload(post.id).catch(err =>
    logger.error('Image upload failed', err)
  );
}
```

---

## 11. FINAL RECOMMENDED ARCHITECTURE

### 11.1 Complete Implementation Sequence

```
WEEK 1: Backend Foundation
├── Day 1-2: Database migration & schema design
├── Day 3: Create StudentNotification module structure
├── Day 4-5: Implement controllers, services, repositories
└── Day 6-7: Integration tests & push notification handler

WEEK 2: Mobile Implementation
├── Day 1-2: Push token registration in student app
├── Day 3: Message list component & hooks
├── Day 4: Message detail screen
├── Day 5: Local SQLite database integration
└── Day 6-7: Testing, error handling, polish

WEEK 3: Integration & Deployment
├── Day 1-2: End-to-end testing (admin → student app)
├── Day 3: Notification processor debugging
├── Day 4-5: Load testing (bulk sends)
├── Day 6: Staging deployment
└── Day 7: Production deployment & monitoring
```

### 11.2 Key Implementation Decisions

| Decision                                              | Rationale                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| **Separate StudentMessage table**                     | Simpler than PostParent mapping for students, clearer intent   |
| **StudentNotificationToken separate from Parent.arn** | Clean separation of concerns, easier to scale                  |
| **Reuse PostStudent for both parent/student**         | Avoids duplication, single source of truth for message targets |
| **message_type column in Post**                       | Allows admin to send parent-only, student-only, or both        |
| **SQLite local caching**                              | Works offline, faster list load, reduced API calls             |
| **Pull-to-refresh + push**                            | Familiar UX, no complex WebSocket handling                     |
| **No SMS for students**                               | Keep implementation simple per requirements                    |
| **Same push service (Expo/AWS)**                      | Reuses existing infrastructure, no new services                |

### 11.3 Success Criteria

```
✅ Backend:
  - StudentNotificationToken tokens stored correctly
  - StudentMessage entries created on post creation
  - POST /mobile/student/device-token endpoint working
  - GET /mobile/student/messages returns correct data
  - Push notifications sent to students
  - Messages persist after push send

✅ Mobile:
  - Expo push token generated and registered
  - Notifications received while app open/closed
  - Message list populated from API
  - Infinite scroll working
  - Read/unread tracking working
  - Message detail screen displays full content
  - Pull-to-refresh updates list

✅ Integration:
  - Admin sends message → all targeted students receive push
  - Student taps notification → navigated to message detail
  - Student marks message as read → tracked in backend
  - Multiple devices per student works (multiple tokens)
  - Bulk sends (100+ students) complete within 60 seconds

✅ Quality:
  - No duplicate notifications sent
  - Invalid tokens cleaned up automatically
  - Graceful degradation if Expo service down
  - Error logging for debugging
  - Performance: <2s list load, <500ms detail load
```

### 11.4 Monitoring & Alerts

```typescript
// Add monitoring for:

METRICS:
  - Notifications sent per day (target: 100% of students)
  - Notifications failed (target: <1%)
  - Average token refresh time
  - Message read rate (target: >80% within 24h)
  - Push delivery time (target: <5s)
  - API response time (target: <500ms)

ALERTS:
  if (failedNotifications > 5%) {
    alert('Student notification service degraded');
  }
  if (expiredTokensPerDay > 10) {
    alert('High token expiration rate');
  }
  if (messageReadRate < 50%) {
    alert('Low message engagement');
  }
```

### 11.5 Future Enhancements

```
PHASE 2 (Post-Launch):
  ✨ Web dashboard for students to view messages
  ✨ Message scheduling (send at specific time)
  ✨ Message categories/filtering
  ✨ In-app message compose (student reply to admin)
  ✨ Attachment support (docs, PDFs)
  ✨ Message expiration (auto-delete after N days)
  ✨ Analytics (read rate, engagement time)
  ✨ A/B testing (different notification titles)

PHASE 3 (Advanced):
  🚀 Real-time WebSocket for instant delivery
  🚀 Message encryption
  🚀 Approval workflow (messages require review)
  🚀 Student groups with bulk messaging
  🚀 Message templates
  🚀 Multi-language support
  🚀 Rich text editor for messages
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Backend

- [ ] Create database tables (StudentNotificationToken, StudentMessage)
- [ ] Create StudentNotificationModule
- [ ] Implement StudentNotificationController
- [ ] Implement StudentNotificationService
- [ ] Implement StudentNotificationRepository
- [ ] Update PostService.createPost() to create StudentMessage entries
- [ ] Update push-notification handler for StudentMessage
- [ ] Write tests for new endpoints
- [ ] Database migration script

### Mobile (student)

- [ ] Add expo-notifications to dependencies
- [ ] Create notifications.ts utility
- [ ] Create messageService.ts
- [ ] Create useMessages hook
- [ ] Create MessageCard component
- [ ] Create MessageDetail screen
- [ ] Update home page to display messages
- [ ] Update app layout to init notifications
- [ ] Add push token registration on app launch
- [ ] Implement pull-to-refresh
- [ ] Add read/unread tracking
- [ ] Add error handling
- [ ] Test on iOS and Android devices

### Testing

- [ ] End-to-end test: admin send → student receives
- [ ] Test token registration flow
- [ ] Test duplicate message handling
- [ ] Test message mark as read
- [ ] Test multiple devices per student
- [ ] Test bulk message sends (100+ students)
- [ ] Test offline behavior
- [ ] Test token refresh

### Deployment

- [ ] Database migration on production
- [ ] Backend deployment
- [ ] Mobile app build and store submission
- [ ] Notification processor monitoring
- [ ] Performance testing
- [ ] Rollback plan

---

**Document Version:** 1.0  
**Last Updated:** May 8, 2026  
**Status:** Ready for Implementation
