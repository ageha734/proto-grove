import { assertEquals } from "@std/assert";
import {
  parseConstraint,
  rewriteConstraint,
} from "../../src/parser/constraint.ts";

Deno.test("parseConstraint - gte constraint", () => {
  const result = parseConstraint(">=1.7.7");
  assertEquals(result.kind, "gte");
  assertEquals(result.version, "1.7.7");
});

Deno.test("parseConstraint - exact version", () => {
  const result = parseConstraint("1.7.7");
  assertEquals(result.kind, "exact");
  assertEquals(result.version, "1.7.7");
});

Deno.test("parseConstraint - major only", () => {
  const result = parseConstraint("22");
  assertEquals(result.kind, "major");
  assertEquals(result.version, "22");
});

Deno.test("parseConstraint - major.minor", () => {
  const result = parseConstraint("1.25");
  assertEquals(result.kind, "major_minor");
  assertEquals(result.version, "1.25");
});

Deno.test("parseConstraint - stable", () => {
  const result = parseConstraint("stable");
  assertEquals(result.kind, "stable");
  assertEquals(result.version, null);
});

Deno.test("parseConstraint - empty", () => {
  const result = parseConstraint("");
  assertEquals(result.kind, "empty");
  assertEquals(result.version, null);
});

Deno.test("rewriteConstraint - gte", () => {
  const constraint = parseConstraint(">=1.7.7");
  assertEquals(rewriteConstraint(constraint, "1.8.0"), ">=1.8.0");
});

Deno.test("rewriteConstraint - major_minor", () => {
  const constraint = parseConstraint("1.25");
  assertEquals(rewriteConstraint(constraint, "1.26.3"), "1.26");
});

Deno.test("rewriteConstraint - major", () => {
  const constraint = parseConstraint("22");
  assertEquals(rewriteConstraint(constraint, "23.1.0"), "23");
});

Deno.test("rewriteConstraint - exact", () => {
  const constraint = parseConstraint("1.7.7");
  assertEquals(rewriteConstraint(constraint, "1.8.0"), "1.8.0");
});
