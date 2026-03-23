import { getClient } from '../lib/http-client';
import type { ApiResponse } from '../lib/http-client';
import type { OtpGenerateRequest, OtpVerifyRequest } from '../types/otpTypes';

class OtpService {
  generate(payload: OtpGenerateRequest): Promise<ApiResponse<any>> {
    return getClient().post('/otp/v1/generate', payload);
  }

  verify(payload: OtpVerifyRequest): Promise<ApiResponse<any>> {
    return getClient().post('/otp/v1/verify', payload);
  }
}

export const otpService = new OtpService();
