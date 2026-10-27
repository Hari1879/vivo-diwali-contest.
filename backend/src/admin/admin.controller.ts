import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { EntryQueryDto, ExportQueryDto, LoginDto, ModelDto, UpdateStatusDto } from './admin.dto';
import { AdminService } from './admin.service';
import { AdminGuard } from './auth';
import type { AdminRequest } from './auth';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const spreadsheetUpload = FileInterceptor('file', {
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|csv)$/i.test(file.originalname);
    cb(ok ? null : new BadRequestException('Please upload an .xlsx or .csv file'), ok);
  },
});

function requireFile(file?: Express.Multer.File): Express.Multer.File {
  if (!file) throw new BadRequestException('Please choose a file to upload');
  return file;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto.username, dto.password);
  }

  @UseGuards(AdminGuard)
  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @UseGuards(AdminGuard)
  @Get('entries')
  entries(@Query() q: EntryQueryDto) {
    return this.service.listEntries(q);
  }

  @UseGuards(AdminGuard)
  @Get('entries/export')
  export(@Query() q: ExportQueryDto, @Res() res: Response) {
    return this.service.exportEntries(q, res);
  }

  @UseGuards(AdminGuard)
  @Patch('entries/:id/status')
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @UseGuards(AdminGuard)
  @Post('imeis/upload')
  @UseInterceptors(spreadsheetUpload)
  uploadImeis(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AdminRequest) {
    return this.service.uploadImeis(requireFile(file), req.admin.username);
  }

  @UseGuards(AdminGuard)
  @Get('imeis/uploads')
  uploads() {
    return this.service.listUploads();
  }

  @UseGuards(AdminGuard)
  @Get('imeis/:imei')
  checkImei(@Param('imei') imei: string) {
    if (!/^\d{15}$/.test(imei)) throw new BadRequestException('IMEI must be 15 digits');
    return this.service.checkImei(imei);
  }

  @UseGuards(AdminGuard)
  @Post('stores/upload')
  @UseInterceptors(spreadsheetUpload)
  uploadStores(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.service.uploadStores(requireFile(file));
  }

  @UseGuards(AdminGuard)
  @Get('models')
  models() {
    return this.service.listModels();
  }

  @UseGuards(AdminGuard)
  @Post('models')
  addModel(@Body() dto: ModelDto) {
    return this.service.addModel(dto.name);
  }

  @UseGuards(AdminGuard)
  @Delete('models/:id')
  deleteModel(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteModel(id);
  }
}
