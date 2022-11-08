import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { AttributeMap, WriteRequest } from 'aws-sdk/clients/dynamodb';
import { Construct } from 'constructs';

export interface DynamoDbBootstrapDataProps {
  table: Table;
  bootstrapData: AttributeMap[];
}

const batchAddItems = (scope: Construct, table: Table, items: AttributeMap[]): void => {
  const policyStatement = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:batchWriteItem'],
    resources: [table.tableArn]
  });
  const policy = AwsCustomResourcePolicy.fromStatements([policyStatement]);
  const batchCount = Math.ceil(items.length / 25);
  for (let i = 0; i < batchCount; i++) {
    const batchItems: WriteRequest[] = [];
    while (batchItems.length < 26 && items.length > 0) {
      batchItems.push({
        PutRequest: {
          Item: items.shift()!
        }
      });
    }
    const intializationData: AwsSdkCall = {
      service: 'DynamoDB',
      action: 'batchWriteItem',
      physicalResourceId: PhysicalResourceId.of(`${table.tableName}-bootstrap-${i}`),
      parameters: {
        "RequestItems": { [table.tableName]: batchItems }
      }
    };
    new AwsCustomResource(scope, `DynamoBootstrap_${i}`, {
      onUpdate: intializationData,
      onCreate: intializationData,
      policy
    });
  }
}

export class DynamoDbBootstrapData extends Construct {
  public constructor(scope: Construct, id: string, { table, bootstrapData }: DynamoDbBootstrapDataProps) {
    super(scope, id);
    batchAddItems(this, table, bootstrapData);
    this.node.addDependency(table);
  }
}
