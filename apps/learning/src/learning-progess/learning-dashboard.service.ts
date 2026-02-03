import { Injectable } from '@nestjs/common';
import {
  LearningProgressService,
  ProgressSummary,
} from './learning-progress.service';
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
  private readonly quizServiceUrl =
    process.env.QUIZ_SERVICE_URL ?? 'http://localhost:3002';

  constructor(
    private readonly learningProgressService: LearningProgressService,
    private readonly httpService: HttpService,
  ) {}

  async getDashboard(userId: string): Promise<LearningDashboardResponse> {
    const progressPromise = this.learningProgressService.getSummary(userId);

    const quizStatsPromise = firstValueFrom(
      this.httpService.get(
        `${this.quizServiceUrl}/api/learning/users/${userId}/stats`,
      ),
    )
      .then((res) => res.data)
      .catch((err) => {
        console.error('Failed to fetch quiz stats for dashboard:', err.message);
        return { totalAttempts: 0, passedAttempts: 0 };
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
