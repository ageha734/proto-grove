import { assertEquals } from "@std/assert";
import { detectUpdateType, isOutdated } from "../../src/version/comparator.ts";

Deno.test("isOutdated - newer version available", () => {
  assertEquals(isOutdated("1.7.7", "1.8.0"), true);
});

Deno.test("isOutdated - same version", () => {
  assertEquals(isOutdated("1.7.7", "1.7.7"), false);
});

Deno.test("isOutdated - current is newer", () => {
  assertEquals(isOutdated("2.0.0", "1.9.9"), false);
});

Deno.test("isOutdated - patch update", () => {
  assertEquals(isOutdated("1.7.7", "1.7.8"), true);
});

Deno.test("isOutdated - major update", () => {
  assertEquals(isOutdated("1.7.7", "2.0.0"), true);
});

Deno.test("isOutdated - empty version", () => {
  assertEquals(isOutdated("", "1.0.0"), false);
});

Deno.test("detectUpdateType - major", () => {
  assertEquals(detectUpdateType("1.7.7", "2.0.0"), "major");
});

Deno.test("detectUpdateType - minor", () => {
  assertEquals(detectUpdateType("1.7.7", "1.8.0"), "minor");
});

Deno.test("detectUpdateType - patch", () => {
  assertEquals(detectUpdateType("1.7.7", "1.7.8"), "patch");
});
