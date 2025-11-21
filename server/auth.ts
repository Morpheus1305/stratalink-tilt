import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'stratalink-labs-secret-key-dev-only';
const JWT_TEMP_SECRET = process.env.JWT_TEMP_SECRET || 'stratalink-temp-token-secret';
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TempTokenPayload {
  userId: string;
  email: string;
  purpose: 'otp_verification';
}

export const authHelpers = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
    });
  },

  generateTempToken(userId: string, email: string): string {
    const payload: TempTokenPayload = {
      userId,
      email,
      purpose: 'otp_verification',
    };

    return jwt.sign(payload, JWT_TEMP_SECRET, {
      expiresIn: '10m',
    });
  },

  verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  },

  verifyTempToken(token: string): TempTokenPayload {
    return jwt.verify(token, JWT_TEMP_SECRET) as TempTokenPayload;
  },

  generateEmailOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  generateTOTPSecret(): { secret: string; otpAuthUrl: string } {
    const secret = speakeasy.generateSecret({
      name: 'StrataLink Labs Terminal',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpAuthUrl: secret.otpauth_url || '',
    };
  },

  async generateQRCode(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl);
  },

  verifyTOTP(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  },

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substr(2, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  },
};

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  console.log(`[AUTH] Sending OTP to ${email}: ${otp}`);
  console.log('='.repeat(50));
  console.log(`📧 OTP CODE: ${otp}`);
  console.log(`📧 Sent to: ${email}`);
  console.log(`📧 Valid for: 3 minutes`);
  console.log('='.repeat(50));
}
