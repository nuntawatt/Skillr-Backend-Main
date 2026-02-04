import { Injectable } from '@nestjs/common';
import { LearningProgressService, ProgressSummary } from './learning-progress.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export type QuizAttemptInsight = {
  quizId: number;
  passed: boolean;
  score?: number;
  completedAt?: Date;
};

export type QuizAttemptStats = {
  totalAttempts: number;
  passedAttempts: number;
  latestAttempt?: QuizAttemptInsight;
};

export type LearningDashboardResponse = {
  progress: ProgressSummary;
  quizzes: QuizAttemptStats;
};

@Injectable()
export class LearningDashboardService {
  private readonly quizServiceUrl = process.env.QUIZ_SERVICE_URL ?? 'http://localhost:3002';

  constructor(
    private readonly learningProgressService: LearningProgressService,
    private readonly httpService: HttpService,
  ) { }

  async getDashboard(userId: string): Promise<LearningDashboardResponse> {
    const progressPromise = this.learningProgressService.getSummary(userId);

    // ปิดการเรียก Quiz Stats ชั่วคราว - คืนค่า default
    const quizStatsPromise = Promise.resolve({ 
      totalAttempts: 0, 
      passedAttempts: 0 
    });

    const [progress, quizzes] = await Promise.all([
      progressPromise,
      quizStatsPromise,
    ]);

    return {
      progress,
      quizzes,
    };
  }
}
