import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CookieMap,
  createPolicy,
  JwtToken,
  parseCookies,
  verifyToken,
} from "./utils/utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Book } from "../shared/types";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async function (event: any) {
    const bookId = event.pathParameters?.bookId ? parseInt(event.pathParameters.bookId, 10) : undefined;

 
    console.log("[EVENT]", JSON.stringify(event));
  const cookies: CookieMap = parseCookies(event);
  if (!cookies) {
    return {
      statusCode: 200,
      body: "Unauthorised request!!",
    };
  }

  const verifiedJwt: JwtToken = await verifyToken(
    cookies.token,
    process.env.USER_POOL_ID,
    process.env.REGION!
  );

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

    console.log("[EVENT]", JSON.stringify(event));
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    const book: Book = result.Item as Book;

    if(verifiedJwt!.sub != result.Item.userId){
        return {
            statusCode: 500,
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ message: "You are not the owner" }),
          };
    }

    const updatedBookData: Book = {
        id: bookId,
        ...body
    }

    const commandOutput = await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: updatedBookData,
      })
    );
    return {
      statusCode: 201,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: `Book with the ${bookId} bookId updated` }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
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