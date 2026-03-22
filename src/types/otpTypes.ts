export type OtpType = 'phone' | 'email';

export interface OtpGenerateRequest {
  request: {
    key: string;
    type: OtpType;
    captchaToken: string;
  };
}

export interface OtpVerifyRequest {
  request: {
    key: string;
    type: OtpType;
    otp: string;
  };
}
