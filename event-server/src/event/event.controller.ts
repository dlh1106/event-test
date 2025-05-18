import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EventService } from './event.service';
import { Event } from './entities/event.schema';
import { CreateEventDto } from 'src/common/dto/create.event.dto';
import { UpdateEventDto } from 'src/common/dto/update.event.dto';

@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // 모든 이벤트 조회
  @Get()
  @ApiOperation({ summary: '모든 이벤트 조회' })
  @ApiResponse({ status: 200, description: '이벤트 목록 조회 성공', type: [Event] })
  async getAllEvents(): Promise<Event[]> {
    return this.eventService.getEvents();
  }

  // 특정 이벤트 조회
  @Get(':id')
  @ApiOperation({ summary: '특정 이벤트 조회' })
  @ApiParam({ name: 'id', description: '이벤트 ID' })
  @ApiResponse({ status: 200, description: '이벤트 조회 성공', type: Event })
  @ApiResponse({ status: 404, description: '이벤트를 찾을 수 없음' })
  async getEventById(@Param('id') id: string): Promise<Event> {
    return this.eventService.getEventById(id);
  }

  // 이벤트 생성
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '이벤트 생성' })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({ status: 201, description: '이벤트 생성 성공', type: Event })
  async createEvent(@Body() createEventDto: CreateEventDto): Promise<Event> {
    return this.eventService.createEvent(createEventDto);
  }

  // 이벤트 수정
  @Put(':id')
  @ApiOperation({ summary: '이벤트 수정' })
  @ApiParam({ name: 'id', description: '이벤트 ID' })
  @ApiBody({ type: UpdateEventDto }) // 수정 DTO로 변경
  @ApiResponse({ status: 200, description: '이벤트 수정 성공', type: Event })
  @ApiResponse({ status: 404, description: '이벤트를 찾을 수 없음' })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    return this.eventService.updateEvent(id, updateEventDto);
  }

  // 이벤트 삭제
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '이벤트 삭제' })
  @ApiParam({ name: 'id', description: '이벤트 ID' })
  @ApiResponse({ status: 204, description: '이벤트 삭제 성공' })
  @ApiResponse({ status: 404, description: '이벤트를 찾을 수 없음' })
  async deleteEvent(@Param('id') id: string): Promise<void> {
    return this.eventService.deleteEvent(id);
  }
}
