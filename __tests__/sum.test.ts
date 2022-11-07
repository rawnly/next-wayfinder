import { sum } from "@/math";
import { it, expect } from "vitest";

it("should sum numbers", () => {
	const result = sum(10, 10);
	expect(result).toBe(20);
});
