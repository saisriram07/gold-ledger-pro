import { describe, it, expect } from "vitest";
import { computeInterest, durationParts, buildLedger } from "@/lib/interest";
describe("engine", () => {
  it("3y3m2d compound", () => {
    expect(durationParts("2023-05-08","2026-08-10")).toMatchObject({years:3,months:3,days:2});
    const r = computeInterest(12000,2,"2023-05-08","2026-08-10");
    expect(Math.round(r.interest)).toBe(12283);
  });
  it("under a year simple", () => {
    const r = computeInterest(12000,2,"2023-05-08","2023-05-29");
    expect(Math.round(r.interest)).toBe(168);
    const r2 = computeInterest(12000,2,"2023-05-08","2024-04-19");
    expect(Math.round(r2.interest)).toBe(2728);
  });
  it("jama chain", () => {
    const l = buildLedger(12000,2,"2023-05-08",[{amount:5000,paid_date:"2024-04-19"}],"2025-11-20");
    expect(Math.round(l.remainingPrincipal + l.remainingInterest)).toBe(13687);
  });
});
