import 'source-map-support/register';

import { App } from '@aws-cdk/core';

import { DbStartupShutdownLambdaStack } from '../lib/db-startup-shutdown-lambda-stack';
import { DbStartupShutdownLambdaPipelineStack } from "../lib/db-startup-shutdown-lambda-pipeline-stack";

const accountId = '004385754915';
const region = 'ap-southeast-2';

const mysqlInstanceId = 'db-startup-shutdown-lambda-mysql';
const mysqlInstanceARN = 'arn:aws:rds:ap-southeast-2:004385754915:db:db-startup-shutdown-lambda-mysql';
const postgresqlInstanceId = 'db-startup-shutdown-lambda-postgresql';
const postgresqlInstanceARN = 'arn:aws:rds:ap-southeast-2:004385754915:db:db-startup-shutdown-lambda-postgresql';

const app = new App();

const lambdaStack = new DbStartupShutdownLambdaStack(app, 'LambdaStack', {
  env: {
    account: accountId,
    region: region
  },
  mysqlInstanceId: mysqlInstanceId,
  mysqlInstanceARN: mysqlInstanceARN,
  postgresqlInstanceId: postgresqlInstanceId,
  postgresqlInstanceARN: postgresqlInstanceARN,
});

new DbStartupShutdownLambdaPipelineStack(app, 'LambdaPipelineStack', {
  env: {
    account: accountId,
    region: region
  },
  startUpLambdaCode: lambdaStack.startupLambdaCode,
  shutDownLambdaCode: lambdaStack.shutdownLambdaCode,
});

app.synth();
