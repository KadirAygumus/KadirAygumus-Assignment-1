import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import { CookieMap, createPolicy, parseCookies, verifyToken } from "../utils/utils";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  console.log("[EVENT]", event);

  const cookies: CookieMap = parseCookies(event);

  if (!cookies) {
    return {
      principalId: "",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  const verifiedJwt = await verifyToken(
    cookies.token,
    process.env.USER_POOL_ID,
    process.env.REGION!
  );

  return {
    principalId: verifiedJwt ? verifiedJwt.sub!.toString() : "",
    policyDocument: createPolicy(event, verifiedJwt ? "Allow" : "Deny"),
  };
};