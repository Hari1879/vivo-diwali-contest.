import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateEntryDto, MarkPlayedDto } from './create-entry.dto';
import { PublicService } from './public.service';

@Controller()
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('stores/:code')
  getStore(@Param('code') code: string) {
    return this.service.findStore(code);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('entries')
  create(@Body() dto: CreateEntryDto, @Req() req: Request) {
    return this.service.createEntry(dto, req.ip ?? null, req.get('user-agent') ?? null);
  }

  @Post('entries/:id/played')
  played(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: MarkPlayedDto) {
    return this.service.markPlayed(id, dto.playToken);
  }
}
