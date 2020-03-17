import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { DbStartupShutdownLambdaStack, DbStartupShutdownLambdaStackProps } from '../lib/db-startup-shutdown-lambda-stack';

test('Empty Stack', () => {

  const app = new cdk.App();

  // WHEN
  const stack = new DbStartupShutdownLambdaStack(app, 'MyTestStack', {} as DbStartupShutdownLambdaStackProps);

  // THEN
  expectCDK(stack).to(matchTemplate({
    "Resources": {}
  }, MatchStyle.EXACT))
});
