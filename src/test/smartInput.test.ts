import { describe, it, expect } from "vitest";
import { extractSourceFallback } from "../components/SmartTransactionInput";

describe("Smart Input Extraction Fallbacks", () => {
  describe("extractSourceFallback", () => {
    it("should parse UPI keywords", () => {
      expect(extractSourceFallback("paid via upi")).toBe("UPI");
      expect(extractSourceFallback("gpay 200")).toBe("UPI");
      expect(extractSourceFallback("sent on phonepe")).toBe("UPI");
    });

    it("should parse CC keywords", () => {
      expect(extractSourceFallback("paid with cc")).toBe("CC");
      expect(extractSourceFallback("using credit card")).toBe("CC");
      expect(extractSourceFallback("visa card transaction")).toBe("CC");
    });

    it("should parse Bank keywords", () => {
      expect(extractSourceFallback("transfer to bank")).toBe("Bank");
      expect(extractSourceFallback("neft transfer")).toBe("Bank");
      expect(extractSourceFallback("wire account")).toBe("Bank");
    });

    it("should parse Cash keywords", () => {
      expect(extractSourceFallback("cash payment")).toBe("Cash");
      expect(extractSourceFallback("paid cash")).toBe("Cash");
    });

    it("should default to Cash if unrecognized", () => {
      expect(extractSourceFallback("bought food")).toBe("Cash");
    });
  });
});
