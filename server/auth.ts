import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import type { User, PublicUser } from '@shared/schema';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export function sanitizeUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorMethod: user.twoFactorMethod,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

function createOTPEmailHTML(otp: string, recipientName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StrataLink Labs - Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <div style="display: inline-block; background-color: #F5C211; width: 48px; height: 48px; border-radius: 8px; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 8V12L14 14" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">STRATALINK LABS</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #9ca3af;">Institutional Liquidity Intelligence Terminal</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">Two-Factor Authentication</h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #d1d5db;">
                Hello ${recipientName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #d1d5db;">
                You are receiving this email because you requested a verification code to access your StrataLink Labs Terminal account.
              </p>
              
              <!-- OTP Code Box -->
              <div style="background-color: #0a0a0a; border: 2px solid #F5C211; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0;">
                <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600;">Your Verification Code</p>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #F5C211; margin: 8px 0;">
                  ${otp}
                </div>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #9ca3af;">
                  <strong>Expires in 10 minutes</strong>
                </p>
              </div>
              
              <div style="background-color: rgba(245, 194, 17, 0.1); border-left: 3px solid #F5C211; padding: 16px; border-radius: 4px; margin: 24px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #d1d5db;">
                  <strong style="color: #F5C211;">⚠️ Security Notice:</strong><br/>
                  Never share this code with anyone. StrataLink Labs will never ask you for this code via email or phone.
                </p>
              </div>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 22px; color: #9ca3af;">
                If you did not request this code, please ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} StrataLink Labs. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Institutional-grade Web3 liquidity risk intelligence
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  console.log(`[AUTH] Sending OTP to ${email}: ${otp}`);
  
  try {
    const recipientName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
    
    const { data, error } = await resend.emails.send({
      from: 'StrataLink Labs <noreply@stratalink.ai>',
      to: [email],
      subject: 'Your StrataLink Labs Verification Code',
      html: createOTPEmailHTML(otp, recipientName),
    });

    if (error) {
      console.error('[AUTH] Failed to send OTP email:', error);
      throw new Error('Failed to send verification email');
    }

    console.log('='.repeat(50));
    console.log(`✅ OTP EMAIL SENT`);
    console.log(`📧 To: ${email}`);
    console.log(`📧 Code: ${otp}`);
    console.log(`📧 Message ID: ${data?.id || 'N/A'}`);
    console.log(`📧 Valid for: 10 minutes`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('[AUTH] Error sending OTP email:', error);
    // Fallback to console logging for development
    console.log('='.repeat(50));
    console.log(`⚠️  FALLBACK - OTP CODE: ${otp}`);
    console.log(`📧 Sent to: ${email}`);
    console.log(`📧 Valid for: 10 minutes`);
    console.log('='.repeat(50));
    throw error;
  }
}
