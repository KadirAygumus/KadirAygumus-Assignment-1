# Welcome to my CDK TypeScript project

This is a book management project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


# Book Translation API with AWS CDK

This project is a serverless API for managing a collection of books and translating book summaries, built with AWS CDK, Lambda, API Gateway, and DynamoDB. The project includes user authentication flows (signup, signin, signout, confirm signup) implemented with AWS Cognito and custom Lambda functions.

## Project Structure
```plaintext

.
├── README.md                    # Project overview and documentation
├── addBook.ts                    # Lambda function to add a new book
├── getAllBooks.ts                # Lambda function to fetch all books
├── getBookById.ts                # Lambda function to fetch a book by ID
├── translateBookSummary.ts       # Lambda function to translate a book summary
├── updateBook.ts                 # Lambda function to update a book's information
├── auth/                         # Directory for authentication-related functions
│   ├── authorizer.ts             # Custom authorizer function
│   ├── confirm-signup.ts         # Confirm user signup
│   ├── signin.ts                 # User signin function
│   ├── signout.ts                # User signout function
│   └── signup.ts                 # User signup function
└── utils/
    ├── auth.ts                   # Utility functions for authentication
    └── utils.ts                  # General utility functions
```

## Requirements

Node.js (version 16.x recommended)
AWS CDK
AWS credentials configured for CDK deployment
## Getting Started

# Install dependencies:
npm install
Build the project:
Compile TypeScript to JavaScript.

npm run build
Deploy the stack:
Deploys all resources defined in the CDK app to your AWS account.

cdk deploy
# Seeding Data:
The dbInitData custom resource seeds the DynamoDB BooksTable with initial data from seed/books.json.API Endpoints

## API Endpoints

The API has endpoints for managing books, translations, and user authentication.


## Book Management

| Endpoint                     | Method | Description                      | Authorization       |
|------------------------------|--------|----------------------------------|----------------------|
| `/books`                     | `GET`  | Get a list of all books          | None                |
| `/books/{bookId}`            | `GET`  | Get a book by ID                 | None                |
| `/books/{bookId}/translation`| `GET`  | Translate book summary           | None                |
| `/books`                     | `POST` | Add a new book                   | Custom Authorizer   |
| `/books/{bookId}`            | `PUT`  | Update a book's information      | Custom Authorizer   |

### Authentication

| Endpoint           | Method | Description            |
|--------------------|--------|------------------------|
| `/auth/signup`     | `POST` | Register a new user    |
| `/auth/signin`     | `POST` | Sign in an existing user |
| `/auth/signout`    | `POST` | Sign out a user        |
| `/auth/confirm-signup` | `POST` | Confirm user signup |

### AWS Resources

The following AWS resources are created and managed by this project:

### DynamoDB Tables

BooksTable: Stores book details.
TranslationsTable: Stores translations for books.
API Gateway: REST API to interact with the books and translations.
### Lambda Functions:

Book management: getAllBooksFn, getBookByIdFn, addBookFn, updateBookFn, translateBookSummaryFn

Authentication: signupFn, signinFn, signoutFn, confirmSignupFn

AuthorizerFn: Custom authorizer to secure specific endpoints.

IAM Roles and Policies: Permissions for DynamoDB access and AWS Translate.

Custom Authorizer

The API uses a custom authorizer that verifies user authorization through AWS Cognito and restricts access to certain endpoints.

Environment Variables

The Lambda functions are configured with the following environment variables:

USER_POOL_ID: Cognito User Pool ID
CLIENT_ID: Cognito User Pool Client ID
REGION: AWS Region
