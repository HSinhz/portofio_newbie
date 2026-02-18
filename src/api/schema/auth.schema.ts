// src/api/schema/auth.schema.ts
import gql from "graphql-tag";

export const customAuthSchema = gql`
  type CurrentUser {
    id: ID!
    identifier: String!
  }

  type LoginError {
    errorCode: String!
    message: String!
  }

  union CustomLoginResult = CurrentUser | LoginError

  type ActiveCustomer {
    id: ID!
    firstName: String
    lastName: String
    emailAddress: String!
  }

  type LogoutResult {
    success: Boolean!
  }

  extend type Mutation {
    customLogin(email: String!, password: String!): CustomLoginResult!
    customLogout: LogoutResult!
  }

  extend type Query {
    customMe: ActiveCustomer
  }
`;
