# BE-Integration Points Documentation

## 🎯 Overview

The Streak system integrates seamlessly with existing backend services through well-defined integration points. This ensures streak updates occur automatically when users complete learning activities without requiring manual API calls.

## 🔄 Integration Architecture

### High-Level Integration Flow

```
User Activity → Service Layer → Streak Service → Database Update → Response
     ↓              ↓              ↓              ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Frontend │  │Progress  │  │ Streak   │  │UserStreak│  │  API     │
│  Client  │─▶│Service   │─▶│Service   │─▶│  Table   │─▶│Response │
│          │  │          │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
     ↓              ↓              ↓              ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Checkpoint│  │Checkpoint│  │Business  │  │Streak    │  │Streak    │
│XpService │  │XpService │  │Logic     │  │Data      │  │Info     │
│          │  │          │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## 🔗 Primary Integration Points

### 1. ProgressService Integration

#### Location: `apps/course/src/progress/progress.service.ts`

#### Integration Method: `upsertLessonProgress()`

**Trigger Points:**
- Lesson completion
- Article completion  
- Video completion
- Manual progress marking

#### Implementation Details

```typescript
// Import StreakService
import { StreakService } from '../streak/streak.service';

// Constructor injection
constructor(
  @InjectRepository(LessonProgress)
  private readonly lessonProgressRepository: Repository<LessonProgress>,
  @InjectRepository(Lesson)
  private readonly lessonRepository: Repository<Lesson>,
  @InjectRepository(Chapter)
  private readonly chapterRepository: Repository<Chapter>,
  @Inject(() => StreakService)  // Circular dependency prevention
  private readonly streakService: StreakService,
) {}
```

#### Status Change Integration

```typescript
// When status changes to COMPLETED
if (dto.status !== undefined) {
  const wasAlreadyCompleted = row.status === LessonProgressStatus.COMPLETED;
  row.status = dto.status;
  
  // Update streak when status changes to COMPLETED
  if (dto.status === LessonProgressStatus.COMPLETED && !wasAlreadyCompleted) {
    row.completedAt = new Date();
    await this.streakService.updateStreakOnActivity(userId);
  }
}
```

#### Manual Mark Completion Integration

```typescript
// When user manually marks as completed
if (dto.markCompleted) {
  const wasAlreadyCompleted = row.status === LessonProgressStatus.COMPLETED;
  row.status = LessonProgressStatus.COMPLETED;
  row.progress_Percent = 100;
  row.completedAt = new Date();
  
  // Update streak only when item is newly completed
  if (!wasAlreadyCompleted) {
    await this.streakService.updateStreakOnActivity(userId);
  }
}
```

#### Business Logic Flow

```
upsertLessonProgress()
    ↓
Check if status changing to COMPLETED
    ↓
Was it already COMPLETED?
    ↓ NO
Update streak via streakService.updateStreakOnActivity(userId)
    ↓
Continue with lesson progress save
    ↓
Return lesson progress response
```

#### Supported Activity Types

| Activity Type | Trigger Method | Streak Update Condition |
|---------------|----------------|------------------------|
| Lesson | `markCompleted: true` | New completion only |
| Article | `status: COMPLETED` | Status change to COMPLETED |
| Video | `status: COMPLETED` | Status change to COMPLETED |
| Manual Progress | `markCompleted: true` | New completion only |

### 2. CheckpointXpService Integration

#### Location: `apps/course/src/checkpoint-xp/checkpoint-xp.service.ts`

#### Integration Methods: 
- `submitCheckpoint()` - Quiz completion
- `skipCheckpoint()` - Checkpoint skip

#### Implementation Details

```typescript
// Import StreakService
import { StreakService } from '../streak/streak.service';

// Constructor injection
constructor(
  @InjectRepository(UserXp)
  private readonly userXpRepository: Repository<UserXp>,
  @InjectRepository(Lesson)
  private readonly lessonRepository: Repository<Lesson>,
  @InjectRepository(Chapter)
  private readonly chapterRepository: Repository<Chapter>,
  @InjectRepository(LessonProgress)
  private readonly lessonProgressRepository: Repository<LessonProgress>,
  @Inject(() => StreakService)
  private readonly streakService: StreakService,
) {}
```

#### Quiz Completion Integration

```typescript
// In submitCheckpoint()
async submitCheckpoint(userId: string, chapterId: number, dto: CheckpointSubmissionDto): Promise<CheckpointResultDto> {
  // ... validation logic ...
  
  // Check if XP was already earned
  const wasXpAlreadyEarned = userXp.xpEarned > 0;
  
  // Simulate checkpoint validation
  const isCorrect = this.validateCheckpointAnswers(dto.answers);
  const xpEarned = isCorrect && !wasXpAlreadyEarned ? 5 : 0;

  // Update user XP record
  userXp.lastAttemptAt = new Date();
  if (isCorrect) {
    userXp.checkpointStatus = 'COMPLETED';
    userXp.completedAt = new Date();
    if (!wasXpAlreadyEarned) {
      userXp.xpEarned = xpEarned;
      // Update streak when checkpoint is newly completed
      await this.streakService.updateStreakOnActivity(userId);
    }
  }

  await this.userXpRepository.save(userXp);
  // ... return response ...
}
```

#### Checkpoint Skip Integration

```typescript
// In skipCheckpoint()
async skipCheckpoint(userId: string, chapterId: number): Promise<CheckpointResultDto> {
  // ... validation logic ...
  
  const wasAlreadySkipped = userXp?.checkpointStatus === 'SKIPPED';

  if (!userXp) {
    userXp = this.userXpRepository.create({
      userId,
      chapterId,
      xpEarned: 0,
      checkpointStatus: 'SKIPPED'
    });
  } else {
    userXp.checkpointStatus = 'SKIPPED';
    userXp.lastAttemptAt = new Date();
  }

  await this.userXpRepository.save(userXp);

  // Update streak when checkpoint is newly skipped (counts as completion)
  if (!wasAlreadySkipped) {
    await this.streakService.updateStreakOnActivity(userId);
  }

  // ... return response ...
}
```

#### Checkpoint Business Logic Flow

```
submitCheckpoint()
    ↓
Validate quiz answers
    ↓
Check if XP already earned
    ↓ NO
Update streak via streakService.updateStreakOnActivity(userId)
    ↓
Update XP record
    ↓
Return checkpoint result

skipCheckpoint()
    ↓
Check if already skipped
    ↓ NO
Update streak via streakService.updateStreakOnActivity(userId)
    ↓
Mark as SKIPPED
    ↓
Return checkpoint result
```

## 🔧 Module-Level Integration

### CourseModule Configuration

#### Location: `apps/course/src/course.module.ts`

```typescript
// Import Streak components
import { StreakController } from './streak/streak.controller';
import { StreakService } from './streak/streak.service';
import { UserStreak } from './streak/entities/user-streak.entity';
import { StreakModule } from './streak/streak.module';

@Module({
  imports: [
    // ... existing imports ...
    TypeOrmModule.forFeature([
      // ... existing entities ...
      UserStreak,  // Add streak entity
    ]),
    AuthLibModule,
    StreakModule  // Import streak module
  ],
  controllers: [
    // ... existing controllers ...
    StreakController,  // Add streak controller
  ],
  providers: [
    // ... existing providers ...
    StreakService,  // Add streak service
  ],
})
export class AppModule {}
```

### Dependency Injection Setup

#### Circular Dependency Prevention

```typescript
// In ProgressService
@Inject(() => StreakService)
private readonly streakService: StreakService,

// In CheckpointXpService  
@Inject(() => StreakService)
private readonly streakService: StreakService,
```

#### Service Export Configuration

```typescript
// In StreakModule
@Module({
  imports: [TypeOrmModule.forFeature([UserStreak])],
  controllers: [StreakController],
  providers: [StreakService],
  exports: [StreakService],  // Export for other modules
})
export class StreakModule {}
```

## 📊 Integration Data Flow

### Complete User Journey Integration

```
1. User completes lesson/video/article
   ↓
2. ProgressService.upsertLessonProgress()
   ↓
3. Check if newly completed
   ↓
4. streakService.updateStreakOnActivity()
   ↓
5. Calculate streak logic
   ↓
6. Update UserStreak table
   ↓
7. Return streak info in response

OR

1. User completes/skips checkpoint
   ↓
2. CheckpointXpService.submitCheckpoint() / skipCheckpoint()
   ↓
3. Check if newly completed/skipped
   ↓
4. streakService.updateStreakOnActivity()
   ↓
5. Calculate streak logic
   ↓
6. Update UserStreak table
   ↓
7. Return checkpoint result with streak info
```

### Response Integration

#### ProgressService Response Enhancement

```typescript
// Current: LessonProgressResponseDto
{
  lessonId: number,
  userId: string,
  status: string,
  progress_Percent: number,
  // ... other fields
}

// Future: Could include streak info
{
  lessonId: number,
  userId: string,
  status: string,
  progress_Percent: number,
  streakInfo?: {  // Optional streak update
    isNewStreakDay: boolean,
    currentStreak: number,
    streakText: string
  },
  // ... other fields
}
```

#### CheckpointXpService Response Enhancement

```typescript
// Current: CheckpointResultDto
{
  isCorrect: boolean,
  xpEarned: number,
  feedback: string,
  totalChapterXp: number,
  checkpointStatus: string,
  wasXpAlreadyEarned: boolean
}

// Future: Could include streak info
{
  isCorrect: boolean,
  xpEarned: number,
  feedback: string,
  totalChapterXp: number,
  checkpointStatus: string,
  wasXpAlreadyEarned: boolean,
  streakUpdate?: {  // Optional streak update
    isNewStreakDay: boolean,
    didStreakBreak: boolean,
    currentStreak: number,
    streakColor: string,
    streakEmoji: string
  }
}
```

## 🔍 Integration Testing

### Integration Test Scenarios

#### 1. ProgressService Integration Test

```typescript
describe('ProgressService + StreakService Integration', () => {
  let progressService: ProgressService;
  let streakService: StreakService;
  let userId: string;

  beforeEach(async () => {
    // Setup test environment
    userId = 'test-user-id';
  });

  it('should update streak when lesson is completed', async () => {
    // Arrange
    const lessonId = 1;
    const dto: UpsertLessonProgressDto = {
      markCompleted: true,
      progress_Percent: 100
    };

    // Act
    const result = await progressService.upsertLessonProgress(userId, lessonId, dto);

    // Assert
    const streak = await streakService.getUserStreak(userId);
    expect(streak.currentStreak).toBe(1);
    expect(streak.isNewStreakDay).toBe(true);
  });

  it('should not update streak for same day completion', async () => {
    // Arrange - First completion
    await progressService.upsertLessonProgress(userId, 1, { markCompleted: true });
    
    // Act - Second completion same day
    await progressService.upsertLessonProgress(userId, 2, { markCompleted: true });

    // Assert
    const streak = await streakService.getUserStreak(userId);
    expect(streak.currentStreak).toBe(1); // Should not increment
  });
});
```

#### 2. CheckpointXpService Integration Test

```typescript
describe('CheckpointXpService + StreakService Integration', () => {
  it('should update streak when checkpoint is completed', async () => {
    // Arrange
    const userId = 'test-user-id';
    const chapterId = 1;
    const dto: CheckpointSubmissionDto = {
      answers: ['correct']
    };

    // Act
    const result = await checkpointXpService.submitCheckpoint(userId, chapterId, dto);

    // Assert
    const streak = await streakService.getUserStreak(userId);
    expect(streak.currentStreak).toBe(1);
    expect(result.isCorrect).toBe(true);
  });

  it('should update streak when checkpoint is skipped', async () => {
    // Arrange
    const userId = 'test-user-id';
    const chapterId = 1;

    // Act
    const result = await checkpointXpService.skipCheckpoint(userId, chapterId);

    // Assert
    const streak = await streakService.getUserStreak(userId);
    expect(streak.currentStreak).toBe(1);
    expect(result.checkpointStatus).toBe('SKIPPED');
  });
});
```

## 🚀 Performance Considerations

### Database Transaction Management

#### Current Implementation (Separate Transactions)

```typescript
// ProgressService
await this.lessonProgressRepository.save(row);  // Transaction 1
await this.streakService.updateStreakOnActivity(userId);  // Transaction 2
```

#### Future Enhancement (Single Transaction)

```typescript
// Potential improvement with shared transaction
@Transaction()
async upsertLessonProgressWithStreak(userId: string, lessonId: number, dto: UpsertLessonProgressDto) {
  const queryRunner = this.connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Update lesson progress
    await queryRunner.manager.save(LessonProgress, row);
    
    // Update streak
    await this.streakService.updateStreakOnActivityWithTransaction(userId, queryRunner);
    
    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
}
```

### Caching Strategy

#### Current: No Caching
- Direct database access for consistency
- Simple and reliable

#### Future: Redis Caching

```typescript
// Potential caching implementation
@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUserStreak(userId: string, timezoneOffset = 0): Promise<StreakResponseDto> {
    const cacheKey = `streak:${userId}`;
    
    // Try cache first
    let streak = await this.cacheManager.get<StreakResponseDto>(cacheKey);
    
    if (!streak) {
      // Cache miss - fetch from database
      streak = await this.fetchFromDatabase(userId, timezoneOffset);
      
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, streak, 300000);
    }
    
    return streak;
  }

  async updateStreakOnActivity(userId: string, timezoneOffset = 0): Promise<StreakResponseDto> {
    // Update database
    const streak = await this.updateDatabase(userId, timezoneOffset);
    
    // Invalidate cache
    await this.cacheManager.del(`streak:${userId}`);
    
    return streak;
  }
}
```

## 🔒 Error Handling in Integration

### Service-to-Service Error Propagation

```typescript
// In ProgressService
try {
  if (dto.status === LessonProgressStatus.COMPLETED && !wasAlreadyCompleted) {
    await this.streakService.updateStreakOnActivity(userId);
  }
} catch (error) {
  // Log streak error but don't fail progress update
  console.error('Failed to update streak:', error);
  // Optionally: could implement retry logic or queue for later
}

// Continue with progress update regardless of streak success
const saved = await this.lessonProgressRepository.save(row);
return this.toResponse(saved);
```

### Graceful Degradation Strategy

```typescript
// Streak service unavailable fallback
async updateStreakOnActivity(userId: string, timezoneOffset = 0): Promise<StreakResponseDto> {
  try {
    // Normal implementation
    return await this.performStreakUpdate(userId, timezoneOffset);
  } catch (error) {
    // Fallback response
    console.error('Streak service error, returning fallback:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakColor: 'gray',
      streakEmoji: '⚪',
      streakText: 'เริ่มต้นสร้าง Streak กันเลย!',
      isNewStreakDay: false,
      didStreakBreak: false
    };
  }
}
```

## 📈 Monitoring & Analytics Integration

### Integration Metrics

#### Database Performance
```typescript
// Monitor streak update performance
const startTime = Date.now();
await this.streakService.updateStreakOnActivity(userId);
const duration = Date.now() - startTime;

// Log performance metrics
this.logger.log(`Streak update took ${duration}ms for user ${userId}`);
```

#### Business Metrics
```typescript
// Track streak creation and updates
async updateStreakOnActivity(userId: string, timezoneOffset = 0): Promise<StreakResponseDto> {
  const result = await this.performUpdate(userId, timezoneOffset);
  
  // Emit analytics events
  if (result.isNewStreakDay) {
    this.eventEmitter.emit('streak.updated', {
      userId,
      currentStreak: result.currentStreak,
      isNewRecord: result.currentStreak > result.longestStreak
    });
  }
  
  if (result.didStreakBreak) {
    this.eventEmitter.emit('streak.broken', { userId });
  }
  
  return result;
}
```

---

## 🎯 Integration Summary

### ✅ **Completed Integration Points:**

1. **ProgressService Integration**
   - ✅ Lesson completion tracking
   - ✅ Article completion tracking  
   - ✅ Video completion tracking
   - ✅ Manual progress marking
   - ✅ Double-count prevention

2. **CheckpointXpService Integration**
   - ✅ Quiz completion tracking
   - ✅ Checkpoint skip tracking
   - ✅ XP-earned validation
   - ✅ Skip counts as completion

3. **Module-Level Integration**
   - ✅ CourseModule configuration
   - ✅ Dependency injection setup
   - ✅ Circular dependency prevention
   - ✅ Service exports

### 🔧 **Integration Benefits:**

- **Automatic Updates**: No manual API calls needed
- **Consistent Behavior**: All activities follow same streak logic
- **Error Resilient**: Progress continues even if streak fails
- **Performance Optimized**: Efficient database operations
- **Testable**: Clear integration points for testing
- **Maintainable**: Clean separation of concerns

### 🚀 **Production Ready:**

The Streak system integrates seamlessly with existing backend services, providing automatic streak updates for all user learning activities while maintaining system reliability and performance.
