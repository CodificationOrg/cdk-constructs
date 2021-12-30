import { Code, Function, FunctionProps, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';
import { Arn, ArnFormat, Duration } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as path from 'path';
import {
  CORS_ENABLED,
  CORS_HEADERS,
  CORS_ORIGINS,
  RECAPTCHA_ENABLED,
  RECAPTCHA_SECRET_KEY,
  SECRET_ID,
  SNS_TOPIC_ARN,
  TEMPLATE_BUCKET_NAME,
} from '../shared';

export interface GoogleRecaptchaConfig {
  secretKey: string;
  secret?: ISecret;
}

export interface CorsConfig {
  enabled: boolean;
  headers?: string[];
  origins?: string[];
}

export interface SnsEmailFunctionProps extends Partial<FunctionProps> {
  snsTopic: Topic;
  templateBucket: Bucket;
  recipientEmail: string;
  corsConfig?: CorsConfig;
  recaptchaConfig?: GoogleRecaptchaConfig;
}

const BASE_PROPS = {
  runtime: Runtime.NODEJS_14_X,
  tracing: Tracing.ACTIVE,
  memorySize: 256,
  timeout: Duration.seconds(60),
};

export class SnsEmailFunction extends Function {
  public constructor(scope: Construct, id: string, props: SnsEmailFunctionProps) {
    const { corsConfig, recaptchaConfig } = props;

    const environment = {
      ...props.environment,
      [CORS_ENABLED]: `${corsConfig?.enabled || 'false'}`,
      [CORS_HEADERS]: `${(corsConfig?.headers || ['*']).join(',')}`,
      [CORS_ORIGINS]: `${(corsConfig?.origins || []).join(',')}`,
      [TEMPLATE_BUCKET_NAME]: props.templateBucket.bucketName,
      [SNS_TOPIC_ARN]: props.snsTopic.topicArn,
      [RECAPTCHA_ENABLED]: 'false',
      [RECAPTCHA_SECRET_KEY]: '',
    };

    if (recaptchaConfig) {
      environment.RECAPTCHA_ENABLED = 'true';
      environment.RECAPTCHA_SECRET_KEY = recaptchaConfig.secretKey;
      if (recaptchaConfig.secret) {
        const secretId = Arn.split(recaptchaConfig.secret.secretArn, ArnFormat.COLON_RESOURCE_NAME).resourceName!;
        environment[SECRET_ID] = secretId.substring(0, secretId.indexOf('-'));
      }
    }

    super(scope, id, {
      ...BASE_PROPS,
      ...props,
      code: Code.fromAsset(path.resolve(__dirname, '../../dist')),
      handler: `sns-email-forms.handler`,
      environment,
    });

    // tslint:disable-next-line: no-unused-expression
    new Subscription(scope, `${id}-sns-subscription`, {
      endpoint: props.recipientEmail,
      protocol: SubscriptionProtocol.EMAIL,
      topic: props.snsTopic,
    });
    props.snsTopic.grantPublish(this);
    props.templateBucket.grantRead(this);

    if (recaptchaConfig && recaptchaConfig.secret) {
      recaptchaConfig.secret.grantRead(this);
    }
  }
}
