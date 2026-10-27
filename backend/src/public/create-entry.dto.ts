import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const digitsOnly = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '') : value;

export class CreateEntryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  @Matches(/^[A-Za-z][A-Za-z .'-]*$/, { message: 'Name can contain letters, spaces and . \' - only' })
  name!: string;

  @Transform(digitsOnly)
  @Matches(/^[6-9]\d{9}$/, { message: 'Contact Number must be a valid 10-digit mobile number' })
  contactNumber!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Branch is required' })
  branch!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{3,32}$/, { message: 'Shop Code must be alphanumeric' })
  shopCode!: string;

  @Transform(digitsOnly)
  @Matches(/^[6-9]\d{9}$/, { message: 'Mobile Number must be a valid 10-digit mobile number' })
  mobileNumber!: string;

  @Transform(digitsOnly)
  @Matches(/^\d{15}$/, { message: 'IMEI Number must be exactly 15 digits' })
  imei!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Mobile Model is required' })
  @MaxLength(100)
  mobileModel!: string;

  @Type(() => Number)
  @IsInt({ message: 'Mobile Price must be a whole number' })
  @Min(1, { message: 'Mobile Price is required' })
  mobilePrice!: number;

  @IsBoolean()
  @Equals(true, { message: 'Please accept the Terms & Conditions' })
  termsAccepted!: boolean;
}

export class MarkPlayedDto {
  @IsString()
  @Matches(/^[a-f0-9]{48}$/)
  playToken!: string;
}
