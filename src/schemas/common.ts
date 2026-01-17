import { z } from "zod";

// Common schemas used across tools

export const PaginationSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(500)
    .default(50)
    .describe("Maximum number of results to return (1-500)"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
});

export const SortSchema = z.object({
  attribute: z.string().describe("Attribute slug to sort by"),
  direction: z
    .enum(["asc", "desc"])
    .default("asc")
    .describe("Sort direction"),
});

export const FilterConditionSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
  "greater_than",
  "less_than",
  "greater_than_or_equals",
  "less_than_or_equals",
]);

export const SimpleFilterSchema = z.object({
  attribute: z.string().describe("Attribute slug to filter on"),
  condition: FilterConditionSchema.describe("Filter condition"),
  value: z.unknown().optional().describe("Value to compare against"),
});

// Recursive filter schema for AND/OR conditions
export const FilterSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    SimpleFilterSchema,
    z.object({
      and: z.array(FilterSchema).describe("All conditions must match"),
    }),
    z.object({
      or: z.array(FilterSchema).describe("Any condition must match"),
    }),
  ])
);

export const ObjectIdentifierSchema = z
  .string()
  .describe("Object slug (e.g., 'people', 'companies') or UUID");

export const RecordIdSchema = z
  .string()
  .describe("Record UUID");

export const ListIdentifierSchema = z
  .string()
  .describe("List slug or UUID");

export const EntryIdSchema = z
  .string()
  .describe("Entry UUID");

export const AttributeValuesSchema = z
  .record(z.unknown())
  .describe("Attribute values as key-value pairs (attribute_slug: value)");
