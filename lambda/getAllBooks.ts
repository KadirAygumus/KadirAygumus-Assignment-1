import { APIGatewayProxyHandlerV2 } from "aws-lambda";  
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async function (event: any) {
  try {
    console.log("Event: ", JSON.stringify(event));

    const commandOutput = await ddbClient.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME,  
      })
    );

    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No books found" }),
      };
    }

    const body = {
      data: commandOutput.Items,
    };

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
    };
  }
};


