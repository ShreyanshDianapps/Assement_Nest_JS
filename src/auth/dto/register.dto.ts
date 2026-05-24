import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
  } from 'class-validator';
  
  export class RegisterDto {
    @IsString()
    @MinLength(3)
    username: string;
  
    @IsEmail()
    email: string;
  
    @IsString()
    @MinLength(6)
    password: string;
  
    @IsOptional()
    @IsString()
    fullName?: string;
  
    @IsOptional()
    @IsString()
    designation?: string;
  
    @IsOptional()
    @IsEnum(['user', 'manager', 'admin'])
    role?: 'user' | 'manager' | 'admin';
  }