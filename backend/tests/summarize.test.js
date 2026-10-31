describe("Word count reduction logic", () => {
  const calculateReduction = (originalText, summary) => {
    const originalWords = originalText.trim().split(/\s+/).filter(Boolean).length;
    const summaryWords = summary.trim().split(/\s+/).filter(Boolean).length;
    return originalWords > 0
      ? Math.max(0, Math.round(((originalWords - summaryWords) / originalWords) * 100))
      : 0;
  };

  it("should calculate correct percentage reduction", () => {
    const original = "This is a long piece of text with many many words in it for testing";
    const summary = "This is short";
    const result = calculateReduction(original, summary);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("should return 0 when summary is same length as original", () => {
    const original = "hello world";
    const summary = "hello world";
    const result = calculateReduction(original, summary);
    expect(result).toBe(0);
  });

  it("should never return a negative percentage", () => {
    const original = "short";
    const summary = "this is a much longer summary than original";
    const result = calculateReduction(original, summary);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});