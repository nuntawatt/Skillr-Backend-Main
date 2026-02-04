import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type CourseLessonResponse = {
  lesson_id: number;
  lesson_title: string;
  lesson_type: string;
  chapter_id: number;
  orderIndex: number;
  ref_id: number;
};

@Injectable()
export class CourseClientService {
  private readonly logger = new Logger(CourseClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return (
      this.configService.get<string>('COURSE_SERVICE_URL') ??
      process.env.COURSE_SERVICE_URL ??
      'http://localhost:3002'
    );
  }

  async getLessonById(lessonId: number): Promise<CourseLessonResponse | null> {
    const url = `${this.baseUrl}/api/lessons/${lessonId}`;

    try {
      const res = await firstValueFrom(this.httpService.get<CourseLessonResponse>(url));
      return res.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;

      if (status === 404) {
        return null;
      }

      this.logger.warn(
        `Course service call failed: GET ${url} (${status ?? 'no-status'})`,
      );

      throw new ServiceUnavailableException('Course service unavailable');
    }
  }
}
