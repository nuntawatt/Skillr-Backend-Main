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

export type CourseChapterResponse = {
  chapter_id: number;
  chapter_title: string;
  chapter_name: string;
  chapter_type: string;
  chapter_description?: string;
  chapter_orderIndex: number;
  level_id: number;
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

  async getChapterById(chapterId: number): Promise<CourseChapterResponse | null> {
    const url = `${this.baseUrl}/api/chapters/${chapterId}`;

    try {
      const res = await firstValueFrom(this.httpService.get<CourseChapterResponse>(url));
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

  async getChapterLessons(chapterId: number): Promise<CourseLessonResponse[] | null> {
    const url = `${this.baseUrl}/api/chapters/${chapterId}/lessons`;

    try {
      const res = await firstValueFrom(this.httpService.get<CourseLessonResponse[]>(url));
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
