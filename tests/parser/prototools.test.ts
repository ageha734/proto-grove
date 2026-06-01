import { assertEquals } from "@std/assert";
import { parsePrototools } from "../../src/parser/prototools.ts";

const SAMPLE = `
actionlint = ">=1.7.7"
go = "1.25"
node = "22"
npm = "stable"
empty = ""

[plugins]
actionlint = "https://raw.githubusercontent.com/ageha734/proto-plugins/refs/heads/master/toml/actionlint.toml"
awscli = "github://ageha734/proto-awscli"

[settings]
auto-install = true
`;

Deno.test("parsePrototools - extracts tools", () => {
  const result = parsePrototools(SAMPLE);
  assertEquals(result.tools.length, 5);
});

Deno.test("parsePrototools - correct constraint types", () => {
  const result = parsePrototools(SAMPLE);
  const toolMap = Object.fromEntries(result.tools.map((t) => [t.name, t]));

  assertEquals(toolMap["actionlint"].constraint.kind, "gte");
  assertEquals(toolMap["go"].constraint.kind, "major_minor");
  assertEquals(toolMap["node"].constraint.kind, "major");
  assertEquals(toolMap["npm"].constraint.kind, "stable");
  assertEquals(toolMap["empty"].constraint.kind, "empty");
});

Deno.test("parsePrototools - attaches plugin URLs", () => {
  const result = parsePrototools(SAMPLE);
  const toolMap = Object.fromEntries(result.tools.map((t) => [t.name, t]));

  assertEquals(
    toolMap["actionlint"].pluginUrl,
    "https://raw.githubusercontent.com/ageha734/proto-plugins/refs/heads/master/toml/actionlint.toml",
  );
  assertEquals(toolMap["go"].pluginUrl, null);
});

Deno.test("parsePrototools - extracts plugins map", () => {
  const result = parsePrototools(SAMPLE);
  assertEquals(result.plugins["awscli"], "github://ageha734/proto-awscli");
});
