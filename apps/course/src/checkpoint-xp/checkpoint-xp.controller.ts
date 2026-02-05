import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';
import { CurrentUserId } from '../progress/decorators/current-user-id.decorator';
import { CheckpointResultDto, CheckpointSubmissionDto } from './dto';
import { CheckpointXpService } from './checkpoint-xp.service';

@ApiTags('Checkpoint XP')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkpoint-xp')
export class CheckpointXpController {
  constructor(private readonly checkpointXpService: CheckpointXpService) {}

  @Post(':chapterId/submit')
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

  @Post(':chapterId/skip')
  @ApiOperation({ summary: 'Skip checkpoint quiz' })
  @ApiParam({ name: 'chapterId', type: Number, example: 1 })
  @ApiOkResponse({ type: CheckpointResultDto })
  skipCheckpoint(
    @CurrentUserId() userId: string,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ): Promise<CheckpointResultDto> {
    return this.checkpointXpService.skipCheckpoint(userId, chapterId);
  }

  @Get(':chapterId/status')
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
