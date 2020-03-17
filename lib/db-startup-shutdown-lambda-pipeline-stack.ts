import { Construct, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from "@aws-cdk/aws-codepipeline-actions";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { BuildSpec, PipelineProject, LinuxBuildImage } from "@aws-cdk/aws-codebuild";

export interface DbStartupShutdownLambdaPipelineStackProps extends StackProps {
  readonly startUpLambdaCode: CfnParametersCode;
  readonly shutDownLambdaCode: CfnParametersCode;
}

export class DbStartupShutdownLambdaPipelineStack extends Stack {

  constructor(scope: Construct, id: string, props: DbStartupShutdownLambdaPipelineStackProps) {
    super(scope, id, props);

    // Source Code action
    const oauthToken = SecretValue.secretsManager('/db-startup-shutdown-lambda/github/token', { jsonField: 'github-token' });
    const githubRepo = StringParameter.valueFromLookup(this, "/db-startup-shutdown-lambda/github/repo");
    const githubOwner = StringParameter.valueFromLookup(this, "/db-startup-shutdown-lambda/github/owner");

    const sourceOutput = new Artifact("SourceOutput");

    const sourceAction = new GitHubSourceAction({
      actionName: 'Source',
      owner: githubOwner,
      repo: githubRepo,
      branch: 'master',
      oauthToken: oauthToken,
      output: sourceOutput
    });

    // Build actions
    const lambdaTemplateFilename = 'LambdaStack.template.json';

    const build = this.createBuildProject('Build', lambdaTemplateFilename);

    const buildOutput = new Artifact('BuildOutput');

    const buildAction = new CodeBuildAction({
      actionName: 'Build',
      project: build,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const shutdownLambdaBuild = this.createLambdaBuildProject('ShutdownLambdaBuild', 'shutdown');
    const shutdownLambdaBuildOutput = new Artifact('ShutdownLambdaBuildOutput');
    const shutdownLambdaBuildAction = new CodeBuildAction({
      actionName: 'Shutdown_Lambda_Build',
      project: shutdownLambdaBuild,
      input: sourceOutput,
      outputs: [shutdownLambdaBuildOutput],
    });

    const startupLambdaBuild = this.createLambdaBuildProject('StartupLambdaBuild', 'startup');
    const startupLambdaBuildOutput = new Artifact('StartupLambdaBuildOutput');
    const startupLambdaBuildAction = new CodeBuildAction({
      actionName: 'Startup_Lambda_Build',
      project: startupLambdaBuild,
      input: sourceOutput,
      outputs: [startupLambdaBuildOutput],
    });

    // Deployment action
    const deployAction = new CloudFormationCreateUpdateStackAction({
      actionName: 'Deploy',
      templatePath: buildOutput.atPath(lambdaTemplateFilename),
      stackName: 'LambdaDeploymentStack',
      adminPermissions: true,
      parameterOverrides: {
        ...props.startUpLambdaCode.assign(startupLambdaBuildOutput.s3Location),
        ...props.shutDownLambdaCode.assign(shutdownLambdaBuildOutput.s3Location),
      },
      extraInputs: [startupLambdaBuildOutput, shutdownLambdaBuildOutput]
    });

    // Construct the pipeline
    const pipelineName = "db-startup-shutdown-lambda-pipeline";
    const pipeline = new Pipeline(this, pipelineName, {
      pipelineName: pipelineName,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [startupLambdaBuildAction, shutdownLambdaBuildAction, buildAction],
        },
        {
          stageName: 'Deploy',
          actions: [deployAction],
        }
      ]
    });

    // Make sure the deployment role can get the artifacts from the S3 bucket
    pipeline.artifactBucket.grantRead(deployAction.deploymentRole);
  }

  private createBuildProject(id: string, templateFilename: string) {

    return new PipelineProject(this, id, {
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              "npm install",
              "npm install -g cdk",
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist'
            ],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: [
            templateFilename,
          ],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
      },
    });
  }

  private createLambdaBuildProject(id: string, sourceCodeBaseDirectory: string) {

    return new PipelineProject(this, id, {
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        artifacts: {
          'base-directory': sourceCodeBaseDirectory,
          files: [
            '*.js'
          ],
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1                          ,
      },
    })
  }
}
