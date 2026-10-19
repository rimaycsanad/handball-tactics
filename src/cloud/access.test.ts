import { describe, expect, it } from "vitest";
import { canRead, canWrite, profileSchema } from "./access";
describe("meghívásos csapattagság", () => {
  const member = profileSchema.parse({
    uid: "member",
    email: "member@example.com",
    displayName: "Member",
    role: "editor",
    status: "active",
    admitted: true,
  });
  it("az Auth-fiók és a szerepkör önmagában nem ad csapathozzáférést", () => {
    expect(canRead(null, true)).toBe(false);
    const legacy = profileSchema.parse({
      ...member,
      admitted: undefined,
      role: "admin",
    });
    expect(canRead(legacy, true)).toBe(false);
    expect(canWrite(legacy, true, true)).toBe(false);
    expect(canRead(member, false)).toBe(false);
    expect(canRead({ ...member, status: "suspended" }, true)).toBe(false);
  });
  it("a meghívott, megerősített tag offline olvashat; íráshoz friss jogosultság kell", () => {
    expect(canRead(member, true)).toBe(true);
    expect(canWrite(member, true, false)).toBe(false);
    expect(canWrite(member, true, true)).toBe(true);
    expect(canWrite({ ...member, role: "user" }, true, true)).toBe(false);
  });
});
