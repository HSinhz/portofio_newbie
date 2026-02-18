import { Request, Response, NextFunction } from "express";

export function cartLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log("🌐 Incoming request to:", req.path);

  // Log ALL GraphQL requests
  if (req.body?.query) {
    console.log("📡 GraphQL Query detected");
    console.log("Query:", req.body.query.substring(0, 100) + "...");
  }

  // Log addItemToOrder specifically
  if (req.body?.query?.includes("addItemToOrder")) {
    console.log("🛒 ===== ADD TO CART REQUEST =====");
    console.log("📦 Variables:", JSON.stringify(req.body.variables, null, 2));
    // console.log("👤 Session:", req.session);
    console.log("👤 Session:", (req as any).session);
    console.log("🔑 Headers:", {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie?.substring(0, 50) + "...",
    });
    console.log("=====================================");
  }

  next();
}
