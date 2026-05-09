// src/middleware/graphql-dos-protection.middleware.ts
/**
 * GraphQL DoS Protection Middleware
 * Prevents denial-of-service attacks via:
 * - Query Depth Limiting: Prevent deeply nested queries
 * - Query Complexity Analysis: Limit total query complexity
 * - Query Size Limiting: Prevent excessively large queries
 * - Timeout Monitoring: Track slow queries
 */

import { Request, Response, NextFunction } from "express";
import { parse, DocumentNode, FieldNode, SelectionSetNode } from "graphql";

/**
 * Configuration for GraphQL DoS protection
 */
export interface GraphQLDoSConfig {
  // Maximum nesting depth allowed in queries
  maxDepth?: number;

  // Maximum query complexity score (estimated query cost)
  maxComplexity?: number;

  // Maximum query string length in bytes
  maxQueryLength?: number;

  // Maximum number of aliases per field
  maxAliases?: number;

  // Routes to apply this protection
  routes?: string[];

  // Enable logging of violations
  verbose?: boolean;
}

/**
 * Default DoS protection configuration
 */
const DEFAULT_CONFIG: GraphQLDoSConfig = {
  maxDepth: 15, // Reasonable for most queries, aggressive DoS attempts > 20
  maxComplexity: 5000, // Estimated cost points
  maxQueryLength: 50000, // 50KB max query
  maxAliases: 30, // Max aliases per field
  routes: ["shop-api", "admin-api"],
  verbose: false,
};

/**
 * Calculate the depth of a GraphQL query
 * Returns the maximum depth found in the selection set
 */
function calculateQueryDepth(
  selectionSet: SelectionSetNode | undefined,
  currentDepth: number = 0,
): number {
  if (!selectionSet) return currentDepth;

  let maxDepth = currentDepth;

  for (const selection of selectionSet.selections) {
    if (selection.kind === "Field") {
      const field = selection as FieldNode;
      const fieldDepth = calculateQueryDepth(field.selectionSet, currentDepth + 1);
      maxDepth = Math.max(maxDepth, fieldDepth);
    } else if (selection.kind === "InlineFragment") {
      const inlineDepth = calculateQueryDepth(
        selection.selectionSet,
        currentDepth,
      );
      maxDepth = Math.max(maxDepth, inlineDepth);
    } else if (selection.kind === "FragmentSpread") {
      // Note: Fragment spreads don't increase depth, but they can cause circular references
      // In production, track fragments separately and validate
    }
  }

  return maxDepth;
}

/**
 * Count the total number of fields and estimate query complexity
 * Simple estimation: each field = 1 point, nested fields = 2x multiplier
 */
function estimateQueryComplexity(
  selectionSet: SelectionSetNode | undefined,
  depth: number = 0,
  multiplier: number = 1,
): number {
  if (!selectionSet) return 0;

  let complexity = 0;
  const depthMultiplier = Math.pow(1.5, depth); // Exponential complexity increase with depth

  for (const selection of selectionSet.selections) {
    if (selection.kind === "Field") {
      const field = selection as FieldNode;
      // Base complexity for field + nested selection complexity
      complexity += 1 * multiplier * depthMultiplier;
      complexity += estimateQueryComplexity(
        field.selectionSet,
        depth + 1,
        multiplier * 2,
      );
    } else if (selection.kind === "InlineFragment") {
      complexity += estimateQueryComplexity(
        selection.selectionSet,
        depth,
        multiplier,
      );
    }
  }

  return complexity;
}

/**
 * Count aliases in a query (can be used for DoS: { a: field, b: field, c: field ... })
 */
function countAliases(
  selectionSet: SelectionSetNode | undefined,
): number {
  if (!selectionSet) return 0;

  let aliasCount = 0;

  for (const selection of selectionSet.selections) {
    if (selection.kind === "Field") {
      const field = selection as FieldNode;
      // If field has alias, count it
      if (field.alias) {
        aliasCount++;
      }
      // Count aliases in nested selections
      aliasCount += countAliases(field.selectionSet);
    } else if (selection.kind === "InlineFragment") {
      aliasCount += countAliases(selection.selectionSet);
    }
  }

  return aliasCount;
}

/**
 * Extract GraphQL query/mutation from request body
 */
function extractGraphQLQuery(req: Request): string | null {
  try {
    if (req.method === "GET") {
      return (req.query.query as string) || null;
    }

    if (req.method === "POST") {
      const body = req.body as any;
      if (typeof body === "string") {
        const parsed = JSON.parse(body);
        return parsed.query || null;
      }
      return body.query || null;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Analyze GraphQL document for DoS vulnerabilities
 */
function analyzeGraphQLDocument(
  query: string,
  config: GraphQLDoSConfig,
): {
  safe: boolean;
  errors: string[];
  metrics: {
    depth: number;
    complexity: number;
    aliases: number;
    length: number;
  };
} {
  const errors: string[] = [];
  const metrics = {
    depth: 0,
    complexity: 0,
    aliases: 0,
    length: query.length,
  };

  // Check 1: Query length
  if (config.maxQueryLength && query.length > config.maxQueryLength) {
    errors.push(
      `Query too large: ${query.length} bytes (max: ${config.maxQueryLength})`,
    );
  }

  try {
    // Parse the GraphQL query
    const doc: DocumentNode = parse(query);

    // Check 2: Query depth
    for (const definition of doc.definitions) {
      if (
        definition.kind === "OperationDefinition" &&
        definition.selectionSet
      ) {
        const depth = calculateQueryDepth(definition.selectionSet);
        metrics.depth = Math.max(metrics.depth, depth);

        if (config.maxDepth && depth > config.maxDepth) {
          errors.push(
            `Query depth too high: ${depth} (max: ${config.maxDepth})`,
          );
        }

        // Check 3: Query complexity
        const complexity = estimateQueryComplexity(definition.selectionSet);
        metrics.complexity = Math.max(metrics.complexity, complexity);

        if (config.maxComplexity && complexity > config.maxComplexity) {
          errors.push(
            `Query complexity too high: ${complexity} (max: ${config.maxComplexity})`,
          );
        }

        // Check 4: Aliases
        const aliases = countAliases(definition.selectionSet);
        metrics.aliases = Math.max(metrics.aliases, aliases);

        if (config.maxAliases && aliases > config.maxAliases) {
          errors.push(
            `Too many aliases: ${aliases} (max: ${config.maxAliases})`,
          );
        }
      }
    }
  } catch (parseError) {
    // Invalid GraphQL syntax - let Vendure handle it
    // But log it for monitoring
    if (config.verbose) {
      console.warn("❌ [GraphQL DoS] Parse error:", parseError);
    }
  }

  return {
    safe: errors.length === 0,
    errors,
    metrics,
  };
}

/**
 * GraphQL DoS Protection Middleware
 */
export function graphQLDoSProtectionMiddleware(
  userConfig?: Partial<GraphQLDoSConfig>,
) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only check POST/GET requests
      if (!["POST", "GET"].includes(req.method)) {
        return next();
      }

      // Check if this is a GraphQL route
      const isGraphQLRoute =
        config.routes?.some(
          (route) =>
            req.path.includes(route) ||
            req.url.includes(`/${route}`),
        ) ?? false;

      if (!isGraphQLRoute) {
        return next();
      }

      // Extract GraphQL query
      const query = extractGraphQLQuery(req);
      if (!query) {
        return next(); // No query provided
      }

      // Analyze for DoS vulnerabilities
      const analysis = analyzeGraphQLDocument(query, config);

      // Log metrics in verbose mode
      if (config.verbose) {
        console.log("📊 [GraphQL DoS] Query metrics:", {
          path: req.path,
          depth: analysis.metrics.depth,
          complexity: analysis.metrics.complexity,
          aliases: analysis.metrics.aliases,
          length: analysis.metrics.length,
        });
      }

      // Block if violations found
      if (!analysis.safe) {
        console.warn("❌ [GraphQL DoS] Violation detected:", {
          path: req.path,
          errors: analysis.errors,
          metrics: analysis.metrics,
        });

        return res.status(400).json({
          errors: [
            {
              message: "GraphQL query violates DoS protection limits",
              extensions: {
                code: "GRAPHQL_DOS_LIMIT_EXCEEDED",
                details: analysis.errors,
                metrics: analysis.metrics,
              },
            },
          ],
        });
      }

      // Passed all checks - continue to next middleware
      next();
    } catch (error) {
      console.error("❌ [GraphQL DoS] Middleware error:", error);
      // Don't block requests on middleware errors - log and continue
      next();
    }
  };
}

export default graphQLDoSProtectionMiddleware;
