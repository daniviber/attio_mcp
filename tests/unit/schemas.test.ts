import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  PaginationSchema,
  SortSchema,
  FilterConditionSchema,
  SimpleFilterSchema,
  ObjectIdentifierSchema,
  RecordIdSchema,
  ListIdentifierSchema,
  EntryIdSchema,
  AttributeValuesSchema,
} from "../../src/schemas/common.js";

describe("Schemas", () => {
  describe("PaginationSchema", () => {
    it("should have default values", () => {
      const result = PaginationSchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("should accept valid values", () => {
      const result = PaginationSchema.parse({ limit: 100, offset: 10 });
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(10);
    });

    it("should reject limit below 1", () => {
      expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
    });

    it("should reject limit above 500", () => {
      expect(() => PaginationSchema.parse({ limit: 501 })).toThrow();
    });

    it("should reject negative offset", () => {
      expect(() => PaginationSchema.parse({ offset: -1 })).toThrow();
    });
  });

  describe("SortSchema", () => {
    it("should accept valid sort configuration", () => {
      const result = SortSchema.parse({ attribute: "name", direction: "asc" });
      expect(result.attribute).toBe("name");
      expect(result.direction).toBe("asc");
    });

    it("should have default direction of asc", () => {
      const result = SortSchema.parse({ attribute: "name" });
      expect(result.direction).toBe("asc");
    });

    it("should accept desc direction", () => {
      const result = SortSchema.parse({ attribute: "name", direction: "desc" });
      expect(result.direction).toBe("desc");
    });

    it("should reject invalid direction", () => {
      expect(() =>
        SortSchema.parse({ attribute: "name", direction: "invalid" })
      ).toThrow();
    });
  });

  describe("FilterConditionSchema", () => {
    const validConditions = [
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
    ];

    validConditions.forEach((condition) => {
      it(`should accept "${condition}"`, () => {
        const result = FilterConditionSchema.parse(condition);
        expect(result).toBe(condition);
      });
    });

    it("should reject invalid condition", () => {
      expect(() => FilterConditionSchema.parse("invalid")).toThrow();
    });
  });

  describe("SimpleFilterSchema", () => {
    it("should accept valid filter", () => {
      const result = SimpleFilterSchema.parse({
        attribute: "email",
        condition: "contains",
        value: "@example.com",
      });
      expect(result.attribute).toBe("email");
      expect(result.condition).toBe("contains");
      expect(result.value).toBe("@example.com");
    });

    it("should accept filter without value for is_empty", () => {
      const result = SimpleFilterSchema.parse({
        attribute: "email",
        condition: "is_empty",
      });
      expect(result.attribute).toBe("email");
      expect(result.value).toBeUndefined();
    });
  });

  describe("ObjectIdentifierSchema", () => {
    it("should accept string identifiers", () => {
      expect(ObjectIdentifierSchema.parse("people")).toBe("people");
      expect(ObjectIdentifierSchema.parse("companies")).toBe("companies");
      expect(ObjectIdentifierSchema.parse("custom_object")).toBe("custom_object");
    });

    it("should accept UUIDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(ObjectIdentifierSchema.parse(uuid)).toBe(uuid);
    });
  });

  describe("RecordIdSchema", () => {
    it("should accept record IDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(RecordIdSchema.parse(uuid)).toBe(uuid);
    });
  });

  describe("ListIdentifierSchema", () => {
    it("should accept list slugs", () => {
      expect(ListIdentifierSchema.parse("sales_pipeline")).toBe("sales_pipeline");
    });

    it("should accept list UUIDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(ListIdentifierSchema.parse(uuid)).toBe(uuid);
    });
  });

  describe("EntryIdSchema", () => {
    it("should accept entry IDs", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(EntryIdSchema.parse(uuid)).toBe(uuid);
    });
  });

  describe("AttributeValuesSchema", () => {
    it("should accept empty object", () => {
      const result = AttributeValuesSchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept string values", () => {
      const result = AttributeValuesSchema.parse({ name: "John Doe" });
      expect(result.name).toBe("John Doe");
    });

    it("should accept complex values", () => {
      const values = {
        name: "Acme Corp",
        employees: 100,
        is_active: true,
        tags: ["tech", "startup"],
        address: { city: "San Francisco", country: "USA" },
      };
      const result = AttributeValuesSchema.parse(values);
      expect(result).toEqual(values);
    });
  });
});
