import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";
import { CfnParametersCode, Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { PolicyStatement, Effect } from "@aws-cdk/aws-iam";
import { Rule, Schedule } from "@aws-cdk/aws-events";

export interface DbStartupShutdownLambdaStackProps extends StackProps {
  readonly mysqlInstanceId: string;
  readonly mysqlInstanceARN: string;
  readonly postgresqlInstanceId: string;
  readonly postgresqlInstanceARN: string;
}

export class DbStartupShutdownLambdaStack extends Stack {

  public readonly startupLambdaCode: CfnParametersCode;
  public readonly shutdownLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props: DbStartupShutdownLambdaStackProps) {

    super(scope, id, props);

    this.shutdownLambdaCode = Code.fromCfnParameters();
    this.buildEventTriggeredLambdaFunction("DBShutDown",
      props.mysqlInstanceId, props.mysqlInstanceARN, props.postgresqlInstanceId, props.postgresqlInstanceARN,
      "rds:StopDBInstance", "0 23 ? * MON-SUN *", this.shutdownLambdaCode);

    this.startupLambdaCode = Code.fromCfnParameters();
    this.buildEventTriggeredLambdaFunction("DBStartUp",
      props.mysqlInstanceId, props.mysqlInstanceARN, props.postgresqlInstanceId, props.postgresqlInstanceARN,
      "rds:StartDBInstance", "0 1 ? * MON-SUN *", this.startupLambdaCode);
  }

  private buildEventTriggeredLambdaFunction(name: string,
    mysqlInstanceId: string, mysqlInstanceARN: string, postgresqlInstanceId: string, postgresqlInstanceARN: string,
    instanceAction: string, scheduleExpression: string, lambdaCode: CfnParametersCode): Function {

    const lambdaFunction = this.buildLambdaFunction(`${name}Function`, "app", lambdaCode,
      mysqlInstanceId, postgresqlInstanceId);

    const rolePolicy = this.buildRolePolicy(instanceAction, mysqlInstanceARN, postgresqlInstanceARN);
    lambdaFunction.addToRolePolicy(rolePolicy);

    const eventRule = this.buildEventRule(`${name}Rule`, scheduleExpression);
    eventRule.addTarget(new LambdaFunction(lambdaFunction));

    return lambdaFunction;
  }

  private buildLambdaFunction(id: string, filename: string, code: CfnParametersCode,
    mysqlInstanceId: string, postgresqlInstanceId: string): Function {

    return new Function(this, id, {
      code: code,
      handler: filename + '.lambdaHandler',
      memorySize: 128,
      timeout: Duration.seconds(300),
      runtime: Runtime.NODEJS_12_X,
      environment: {
        MYSQL_INSTANCE_IDENTIFIER: mysqlInstanceId,
        POSTGRESQL_INSTANCE_IDENTIFIER: postgresqlInstanceId
      }
    });
  }

  private buildRolePolicy(actionToAllow: string,
    mysqlInstanceARN: string, postgresqlInstanceARN: string): PolicyStatement {

    return new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [actionToAllow],
      resources: [mysqlInstanceARN, postgresqlInstanceARN]
    });
  }

  private buildEventRule(id: string, scheduleExpression: string): Rule {

    return new Rule(this, id, {
      schedule: Schedule.expression('cron(' + scheduleExpression + ')')
    });
  }
}
