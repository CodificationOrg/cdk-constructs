import { Code, Function, FunctionProps, Runtime, Tracing } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { Subscription, SubscriptionProtocol, Topic } from '@aws-cdk/aws-sns';
import { Construct, Duration } from '@aws-cdk/core';
import * as path from 'path';

export interface SnsEmailFunctionProps extends FunctionProps {
  templateBucket: Bucket;
  snsTopic: Topic;
  recipientEmail: string;
  enableCors?: boolean;
  corsHeaders?: string[];
  corsOrigins?: string[];
  recaptchaEnabled?: boolean;
  recaptchaSecretKey?: string;
}

const BASE_PROPS: Partial<FunctionProps> = {
  runtime: Runtime.NODEJS_12_X,
  tracing: Tracing.ACTIVE,
  memorySize: 256,
  timeout: Duration.seconds(60),
};

export class SnsEmailFunction extends Function {
  public constructor(scope: Construct, id: string, props: SnsEmailFunctionProps) {
    super(scope, id, {
      ...BASE_PROPS,
      ...props,
      code: Code.fromAsset(path.resolve('dist')),
      handler: `sns-email-forms.handler`,
      environment: {
        ...props.environment,
        CORS_ENABLED: `${props.enableCors || 'false'}`,
        CORS_HEADERS: `${(props.corsHeaders || ['*']).join(',')}`,
        CORS_ORIGINS: `${(props.corsOrigins || []).join(',')}`,
        TEMPLATE_BUCKET_NAME: props.templateBucket.bucketName,
        RECAPTCHA_ENABLED: `${props.recaptchaEnabled || 'false'}`,
        RECAPTCHA_SECRET_KEY: props.recaptchaSecretKey || '',
        SNS_TOPIC_ARN: props.snsTopic.topicArn,
      },
    });

    // tslint:disable-next-line: no-unused-expression
    new Subscription(scope, `${id}-sns-subscription`, {
      endpoint: props.recipientEmail,
      protocol: SubscriptionProtocol.EMAIL,
      topic: props.snsTopic,
    });
    props.snsTopic.grantPublish(this);

    props.templateBucket.grantRead(this);
  }
}
