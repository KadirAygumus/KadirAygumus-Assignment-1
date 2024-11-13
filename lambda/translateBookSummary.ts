import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const translateClient = new TranslateClient({ region: process.env.REGION });


export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const bookId = event.pathParameters?.bookId;
    const targetLanguage = event.queryStringParameters?.language;

    if (!bookId || !targetLanguage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing bookId or target language" }),
      };
    }

    const bookData = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME, 
        Key: { id: Number(bookId) },
      })
    );

    if (!bookData.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Book not found" }),
      };
    }

    const bookSummary = bookData.Item.summary;

    const existingTranslation = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME2, 
        Key: { text: bookSummary, language: targetLanguage },
      })
    );

    if (existingTranslation.Item) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          text: existingTranslation.Item.text,
          translation: existingTranslation.Item.translation,
          language: targetLanguage,
        }),
      };
    }

    const translationResult = await translateClient.send(
      new TranslateTextCommand({
        SourceLanguageCode: bookData.Item.language, 
        TargetLanguageCode: targetLanguage,
        Text: bookSummary,
      })
    );

    const translatedText = translationResult.TranslatedText;

    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME2,
        Item: {
          text: bookSummary,
          language: targetLanguage,
          translation: translatedText,
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: bookSummary,
        translation: translatedText,
        language: targetLanguage,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};
