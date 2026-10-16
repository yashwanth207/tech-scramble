import { describe, expect, it } from "vitest";
import raw from "./generated/bank.json";
import { validateBank } from "../engine/validate.ts";
import type { Bank } from "../engine/types.ts";

const bank = raw as unknown as Bank;

describe("published bank", () => {
  it("ships five sets and no content errors", () => {
    const errors = validateBank(bank).filter((issue) => issue.level === "error");
    expect(errors).toEqual([]);
  });
});
