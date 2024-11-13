import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async function (event: any) {
  const bookId = event.pathParameters?.bookId ? parseInt(event.pathParameters.bookId, 10) : undefined;

  console.log("bookId:", bookId);
  console.log("event:", JSON.stringify(event));

  if (!bookId || isNaN(bookId)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid or missing bookId path parameter" }),
    };
  }

  try {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: bookId },
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Book not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error: any) {
    console.error("Error fetching book:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ id: bookId, error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
