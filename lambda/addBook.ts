import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CookieMap,
  createPolicy,
  JwtToken,
  parseCookies,
  verifyToken,
} from "./utils/utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
const ddbDocClient = createDDbDocClient();
import { Book } from "../shared/types";


export const handler: APIGatewayProxyHandlerV2 = async function (event: any) {
  console.log("[EVENT]", JSON.stringify(event));
  const cookies: CookieMap = parseCookies(event);
  if (!cookies) {
    return {
      statusCode: 400,
      body: "Unauthorised request!!",
    };
  }

  const verifiedJwt: JwtToken = await verifyToken(
    cookies.token,
    process.env.USER_POOL_ID,
    process.env.REGION!
  );
  try {
    // Print Event
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
    
    const book: Book = {
      userId: verifiedJwt?.sub,
      ...body
    } as Book;

    const commandOutput = await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: book,
      })
    );
    return {
      statusCode: 201,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: " book added" }),
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