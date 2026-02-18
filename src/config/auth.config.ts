import { AuthOptions } from "@vendure/core";
import "dotenv/config";

export const authOptions: AuthOptions = {
  tokenMethod: ["bearer", "cookie"],
  superadminCredentials: {
    identifier: process.env.SUPERADMIN_USERNAME,
    password: process.env.SUPERADMIN_PASSWORD,
  },
  cookieOptions: {
    secret: process.env.COOKIE_SECRET,
  },
};
