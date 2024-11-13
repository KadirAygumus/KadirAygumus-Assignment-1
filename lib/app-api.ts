import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generateBatch } from "../shared/utils";
import * as custom from "aws-cdk-lib/custom-resources";
import { books } from "../seed/books";
import * as iam from "aws-cdk-lib/aws-iam";


type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    const booksTable = new dynamodb.Table(this, "BooksTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Books",
    });

    const translationsTable = new dynamodb.Table(this, "TranslationsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "text", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "language", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Translations",
    });
    
    translationsTable.addGlobalSecondaryIndex({
      indexName: "LanguageIndex",
      partitionKey: { name: "language", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    
    

    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    new custom.AwsCustomResource(this, "dbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [booksTable.tableName]: generateBatch(books)
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("dbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [booksTable.tableArn],
      }),
    });

    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    };

    const booksRes = appApi.root.addResource("books");
    const booksIdRes = booksRes.addResource("{bookId}");
    const translateBookRes = booksIdRes.addResource("translation")

    const getAllBooksFn = new node.NodejsFunction(this, "getAllBooksFn", {
      ...appCommonFnProps,
      entry: "./lambda/getAllBooks.ts",
      environment: {
        ...appCommonFnProps.environment,
        TABLE_NAME: booksTable.tableName,  
      },
    });

    const translateBookSummaryFn = new node.NodejsFunction(this, "translateBookSummaryFn", {
      ...appCommonFnProps,
      entry: "./lambda/translateBookSummary.ts",
      environment: {
        ...appCommonFnProps.environment,
        TABLE_NAME: booksTable.tableName,  
        TABLE_NAME2: translationsTable.tableName,  

      },
    });


    const addBookFn = new node.NodejsFunction(this, "addBookFn", {
      ...appCommonFnProps,
      entry: "./lambda/addBook.ts",
      environment: {
        ...appCommonFnProps.environment,
        TABLE_NAME: booksTable.tableName,  
      },
    });

    const updateBookFn = new node.NodejsFunction(this, "updateBookFn", {
      ...appCommonFnProps,
      entry: "./lambda/updateBook.ts",
      environment: {
        ...appCommonFnProps.environment,
        TABLE_NAME: booksTable.tableName,  
      },
    });
    
    
    const getBookByIdFn = new node.NodejsFunction(this, "getBookByIdFn", {
      ...appCommonFnProps,
      entry: "./lambda/getBookById.ts",
      environment: {
        ...appCommonFnProps.environment,
        TABLE_NAME: booksTable.tableName,  
      },
    });


    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambda/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );


    booksTable.grantReadData(getBookByIdFn);

    booksTable.grantReadData(getAllBooksFn);

    booksTable.grantReadWriteData(addBookFn);

    booksTable.grantReadWriteData(updateBookFn);

    booksTable.grantReadData(translateBookSummaryFn);
    translationsTable.grantReadWriteData(translateBookSummaryFn);
    translateBookSummaryFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"],
  }));

    booksRes.addMethod("GET", new apig.LambdaIntegration(getAllBooksFn));
    booksIdRes.addMethod("GET", new apig.LambdaIntegration(getBookByIdFn));
    translateBookRes.addMethod("GET", new apig.LambdaIntegration(translateBookSummaryFn));

    booksRes.addMethod("POST", new apig.LambdaIntegration(addBookFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    booksIdRes.addMethod("PUT", new apig.LambdaIntegration(updateBookFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    


  }
}