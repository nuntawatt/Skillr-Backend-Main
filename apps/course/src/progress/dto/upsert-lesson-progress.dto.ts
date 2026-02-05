import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { LessonProgressStatus } from '../entities/lesson-progress.entity';

export class UpsertLessonProgressDto {
    @ApiPropertyOptional({ enum: LessonProgressStatus })
    @IsOptional()
    @IsEnum(LessonProgressStatus)
    status?: LessonProgressStatus;

    @ApiPropertyOptional({ description: '0..100' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    progress_Percent?: number;

    @ApiPropertyOptional({ description: 'Current playback position (seconds)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    position_Seconds?: number;

    @ApiPropertyOptional({ description: 'Total duration (seconds)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    duration_Seconds?: number;

    @ApiPropertyOptional({ description: 'If true, mark lesson completed (sets percent=100)' })
    @IsOptional()
    @IsBoolean()
    markCompleted?: boolean;
}
