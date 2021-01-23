import { Config } from '@codification/cutwater-core';
import {
  CORS_ENABLED,
  CORS_HEADERS,
  CORS_ORIGINS,
  RECAPTCHA_ENABLED,
  RECAPTCHA_SECRET_KEY,
  SNS_TOPIC_ARN,
  TEMPLATE_BUCKET_NAME,
} from '../shared';

export class AppConfig {
  public static get templateBucketName(): string {
    return Config.get(TEMPLATE_BUCKET_NAME);
  }

  public static get snsTopicARN(): string {
    return Config.get(SNS_TOPIC_ARN);
  }

  public static get recaptchaSecretKey(): string {
    return Config.get(RECAPTCHA_SECRET_KEY);
  }

  public static get isReCaptchaEnabled(): boolean {
    return Config.get(RECAPTCHA_ENABLED, 'false').toLocaleLowerCase() === 'true';
  }

  public static get isCORSEnabled(): boolean {
    return Config.get(CORS_ENABLED, 'false').toLocaleLowerCase() === 'true';
  }

  public static get corsHeaders(): string {
    return Config.get(CORS_HEADERS, '*');
  }

  public static get corsOrigins(): string[] {
    return Config.get(CORS_ORIGINS, '*').split(',');
  }
}
