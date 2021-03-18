import { Config } from '@codification/cutwater-core';
import { Logger, LoggerFactory } from '@codification/cutwater-logging';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import { APIGatewayEvent, APIGatewayProxyEvent } from 'aws-lambda';
import { SecretsManager } from 'aws-sdk';
import { RECAPTCHA_SECRET_KEY, SECRET_ID } from '../../shared';
import { AppConfig } from '../AppConfig';
import { DocumentLoader, S3DocumentLoader } from '../document';
import { EmailFormSender } from '../EmailFormSender';
import { MessageFactory, MessageTransformer, ValidatingMessageFactory } from '../message';
import { MessageCommand } from '../MessageCommand';
import { MessageSender, SNSMessageSender } from '../send';
import { MustacheTemplateFactory } from '../template';
import { AJVValidatorFactory, isValidationFailure, MessageValidator, Validator } from '../validate';

const LOG: Logger = LoggerFactory.getLogger();

if (AppConfig.isReCaptchaEnabled) {
  const recaptchaKey = Config.get(RECAPTCHA_SECRET_KEY);
  if (Config.get(SECRET_ID) && recaptchaKey) {
    new SecretsManager().getSecretValue(
      {
        SecretId: Config.get(SECRET_ID),
      },
      (err, data) => {
        if (err) {
          LOG.error('Failed to get secret: ', err);
        } else {
          LOG.debug('Setting secret key for Google Recaptcha...');
          Config.put(RECAPTCHA_SECRET_KEY, JSON.parse(data.SecretString!)[recaptchaKey]);
          LOG.debug('Google Recaptcha secret key set!');
        }
      },
    );
  }
}

const documentLoader: DocumentLoader = new S3DocumentLoader();
const templateFactory = new MustacheTemplateFactory(documentLoader);
const validator: Validator = new MessageValidator(new AJVValidatorFactory(documentLoader));
const messageFactory: MessageFactory = new ValidatingMessageFactory(validator, new MessageTransformer(templateFactory));
const messageSender: MessageSender = new SNSMessageSender();
const sender: EmailFormSender = new EmailFormSender(messageFactory, messageSender);

const baseHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const msgCommand: MessageCommand = toMessageCommand(event);
    await sender.send(msgCommand);
    LOG.debug('Email sent from: ', msgCommand.from);
    return { statusCode: 200, body: '' };
  } catch (err) {
    if (isValidationFailure(err)) {
      LOG.debug('Message failed validation: ', err);
      return {
        statusCode: 400,
        body: JSON.stringify(err),
      };
    } else {
      LOG.error('Error sending email: ', err);
      return {
        statusCode: 500,
        body: JSON.stringify({
          errors: { internal: 'Server error delivering message, see logs for details.' },
        }),
      };
    }
  }
};

const toMessageCommand = (event: APIGatewayEvent): MessageCommand => {
  try {
    return JSON.parse(event.body || '');
  } catch (err) {
    LOG.error('Failed to parse form submission.  Event body: ', event.body);
    throw new Error(`Failed to parse form submission event as a proper JSON object: ${err.message}`);
  }
};

export const handler = !AppConfig.isCORSEnabled
  ? baseHandler
  : middy(baseHandler).use(
      cors({
        origin: AppConfig.corsOrigins.length === 1 ? AppConfig.corsOrigins[0] : undefined,
        origins: AppConfig.corsOrigins.length > 1 ? AppConfig.corsOrigins : undefined,
        headers: AppConfig.corsHeaders,
      }),
    );
