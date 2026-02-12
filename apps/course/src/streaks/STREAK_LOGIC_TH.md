# เอกสารระบบ Streak (Streak System Documentation)

เอกสารนี้สรุป business logic, API endpoints, และโครงสร้างข้อมูล (data structures) สำหรับฟีเจอร์ streak ของผู้ใช้

## หลักการทำงานหลัก (Core Principles)

- **ใช้เวลามาตรฐาน UTC (UTC-Based Time)**: การคำนวณวันที่และเวลาทั้งหมดจะยึดตาม UTC เพื่อป้องกันปัญหา timezone ที่แตกต่างกัน Helper functions ([startOfUtcDay](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:9:0-11:1), [diffDaysUtc](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:21:0-23:1), [isSameUtcDay](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:13:0-15:1)) จะช่วยให้การคำนวณแม่นยำ
- **การรีเซ็ตเมื่อไม่ใช้งาน (Inactivity Reset)**: Streak ของผู้ใช้จะถูกรีเซ็ตหากขาดการใช้งานอย่างน้อย 1 วันเต็ม (ตามปฏิทิน UTC) นับจาก `lastCompletedAt`
- **การทำงานซ้ำได้ (Idempotency)**: การส่ง completion ซ้ำๆ ในวันเดียวกัน (UTC) จะไม่ทำให้ streak เพิ่มขึ้น

---

## โครงสร้างฐานข้อมูล (Database Schema)

**ตาราง:** `user_streak`

Entity [UserStreak](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/entities/user-streak.entity.ts:2:0-25:1) ใช้เก็บข้อมูลเกี่ยวกับ streak ทั้งหมดของผู้ใช้

| คอลัมน์ (Column) | ประเภท (Type) | คำอธิบาย (Description) |
| :--- | :--- | :--- |
| `user_streak_id` | `INT` | Primary Key |
| `user_id` | `UUID` | Foreign key ไปยังตาราง user (มี unique index) |
| `current_streak` | `INT` | จำนวนวันต่อเนื่องที่ผู้ใช้ทำสำเร็จ จะถูกรีเซ็ตเป็น 0 เมื่อไม่ใช้งาน |
| `longest_streak` | `INT` | ค่า `current_streak` สูงสุดที่เคยทำได้ จะไม่ถูกรีเซ็ตเมื่อไม่ใช้งาน |
| `last_completed_at`| `TIMESTAMPTZ`| UTC timestamp ของการทำสำเร็จครั้งล่าสุด ใช้คำนวณความต่อเนื่องของ streak |
| `created_at` | `TIMESTAMPTZ`| Timestamp ตอนที่ record ของผู้ใช้ถูกสร้างขึ้นครั้งแรก |
| `updated_at` | `TIMESTAMPTZ`| Timestamp ของการอัปเดต record ครั้งล่าสุด |

*ไฟล์อ้างอิง: `@/apps/course/src/streaks/entities/user-streak.entity.ts`*

---

## Business Logic (ใน [StreakService](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:25:0-98:1))

*ไฟล์อ้างอิง: `@/apps/course/src/streaks/streak.service.ts`*

### [bumpStreak(userId, now?)](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:32:2-58:3)

Method หลักสำหรับอัปเดต streak ของผู้ใช้

1.  **ตรวจสอบ Record**: ค้นหาหรือสร้าง record [UserStreak](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/entities/user-streak.entity.ts:2:0-25:1) สำหรับ `userId` นั้นๆ
2.  **เช็คการขาด (Inactivity)**: คำนวณส่วนต่างของวัน (UTC) ระหว่าง `now` กับ `lastCompletedAt`
    - หากห่างกันตั้งแต่ 1 วันขึ้นไป (`>= 1`) และ `currentStreak` ไม่ใช่ 0, จะรีเซ็ต `currentStreak` เป็น 0 ก่อนเริ่มนับใหม่
3.  **เช็ควันซ้ำ**: หาก `now` เป็นวันเดียวกับ `lastCompletedAt` (ตามเวลา UTC) จะ return ค่า streak ปัจจุบันทันที (ไม่นับเพิ่ม)
4.  **คำนวณ Streak ใหม่**:
    - ตรวจสอบว่า `now` เป็นวันถัดจาก `lastCompletedAt` หรือไม่
    - ถ้าใช่ (ต่อเนื่อง), `nextCurrent = currentStreak + 1`
    - ถ้าไม่ใช่, `nextCurrent = 1` (เริ่ม streak ใหม่)
5.  **อัปเดตและบันทึก**:
    - `currentStreak` ถูกตั้งค่าเป็น `nextCurrent`
    - `longestStreak` จะถูกอัปเดตหาก streak ใหม่มีค่ามากกว่า (`Math.max(longestStreak, nextCurrent)`)
    - `lastCompletedAt` ถูกตั้งค่าเป็น `now`
    - บันทึกข้อมูลที่อัปเดตลงฐานข้อมูล

### [getStreak(userId)](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:60:2-76:3)

Method สำหรับดึงข้อมูล streak ปัจจุบันของผู้ใช้

1.  **ตรวจสอบ Record**: ค้นหาหรือสร้าง record [UserStreak](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/entities/user-streak.entity.ts:2:0-25:1)
2.  **เช็คการขาด (Inactivity)**: เหมือนกับ [bumpStreak](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:32:2-58:3), จะคำนวณส่วนต่างของวัน
    - หากห่างกันตั้งแต่ 1 วันขึ้นไป (`>= 1`), จะรีเซ็ต `currentStreak` เป็น 0 และบันทึกการเปลี่ยนแปลง
3.  **คืนค่าข้อมูล**: คืนค่า object [UserStreak](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/entities/user-streak.entity.ts:2:0-25:1) พร้อมกับ `color` ที่สอดคล้องกัน

### [resetStreak(userId)](cci:1://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.service.ts:92:2-97:3)

- เป็น utility สำหรับใช้ในตอน dev/test เพื่อรีเซ็ต streak ของผู้ใช้ให้กลับไปเป็นค่าเริ่มต้น (`currentStreak = 0`, `lastCompletedAt = null`)

---

## API Endpoints (ใน [StreakController](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/streak.controller.ts:9:0-253:1))

*ไฟล์อ้างอิง: `@/apps/course/src/streaks/streak.controller.ts`*

### `GET /streaks`

- **คำอธิบาย**: ดึงสถานะ streak ปัจจุบันของผู้ใช้
- **Auth**: ต้องใช้ JWT Bearer Token
- **Response**: [StreakResponseDto](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/dto/streak-response.dto.ts:3:0-36:1)

### Endpoints สำหรับ Development

Endpoints เหล่านี้มีไว้สำหรับทดสอบและพัฒนาเท่านั้น

- **`POST /streaks/test/bump`**: อัปเดต streak โดยสามารถระบุวันที่เองได้
  - **Body**: `{ "date": "YYYY-MM-DDTHH:mm:ss.sssZ" }`
- **`POST /streaks/test/reset`**: รีเซ็ต streak ของผู้ใช้ปัจจุบัน
- **`GET /streaks/test/status`**: ดึงข้อมูลสถานะอย่างละเอียด, รวมถึงเวลาของ server และส่วนต่างของวัน

---

## Data Transfer Objects (DTOs)

### [StreakResponseDto](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/dto/streak-response.dto.ts:3:0-36:1)

*ไฟล์อ้างอิง: `@/apps/course/src/streaks/dto/streak-response.dto.ts`*

เป็น object มาตรฐานสำหรับ response ของ endpoints ที่เกี่ยวกับ streak

| ฟิลด์ (Field) | ประเภท (Type) | คำอธิบาย (Description) |
| :--- | :--- | :--- |
| `currentStreak` | `number` | จำนวนวันต่อเนื่องปัจจุบัน |
| `longestStreak` | `number` | จำนวนวันต่อเนื่องสูงสุดที่เคยทำได้ |
| `lastCompletedAt`| `Date \| null`| UTC timestamp ของการทำสำเร็จครั้งล่าสุด |
| `color` | `StreakColor \| null` | โค้ดสีตาม `currentStreak` (`yellow`, `orange`, `red`, `pink`, `purple`) |
| `isReward` | `boolean` | เป็น `true` ถ้า `currentStreak > 0` เพื่อบอกว่าผู้ใช้มี streak ที่สามารถรับรางวัลได้ |

### [TestBumpDto](cci:2://file:///c:/Project/TypeScript/backend-monorepo/backend-morepo/apps/course/src/streaks/dto/test-bump.dto.ts:3:0-13:1)

*ไฟล์อ้างอิง: `@/apps/course/src/streaks/dto/test-bump.dto.ts`*

- ใช้สำหรับ endpoint `POST /streaks/test/bump`
- ประกอบด้วยฟิลด์ `date` เพียงฟิลด์เดียว ซึ่งต้องเป็น date string ในรูปแบบ ISO 8601