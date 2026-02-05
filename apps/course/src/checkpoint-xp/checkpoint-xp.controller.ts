import { Controller, Post, Get, Param, ParseIntPipe, Body } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../progress/decorators/current-user-id.decorator';
import { CheckpointResultDto, CheckpointSubmissionDto } from './dto';
import { CheckpointXpService } from './checkpoint-xp.service';

@ApiTags('Checkpoint XP')
@Controller('checkpoint-xp')
export class CheckpointXpController {
  constructor(private readonly checkpointXpService: CheckpointXpService) {}

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit checkpoint quiz answers' })
  @ApiParam({ name: 'chapterId', type: Number, example: 1 })
  @ApiOkResponse({ type: CheckpointResultDto })
  submitCheckpoint(
    @CurrentUserId() userId: string,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() dto: CheckpointSubmissionDto,
  ): Promise<CheckpointResultDto> {
    return this.checkpointXpService.submitCheckpoint(userId, chapterId, dto);
  }

  @Post(':Id/skip')
  @ApiOperation({ summary: 'Skip checkpoint quiz' })
  @ApiParam({ name: 'chapterId', type: Number, example: 1 })
  @ApiOkResponse({ type: CheckpointResultDto })
  skipCheckpoint(
    @CurrentUserId() userId: string,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ): Promise<CheckpointResultDto> {
    return this.checkpointXpService.skipCheckpoint(userId, chapterId);
  }

  @Get(':Id/status')
  @ApiOperation({ summary: 'Get checkpoint status and XP earned' })
  @ApiParam({ name: 'chapterId', type: Number, example: 1 })
  @ApiOkResponse({ type: CheckpointResultDto })
  getCheckpointStatus(
    @CurrentUserId() userId: string,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ): Promise<CheckpointResultDto> {
    return this.checkpointXpService.getCheckpointStatus(userId, chapterId);
  }
}
