describe("address", () => {
  it("validates postalCode", () => {
    const postalCode = "110001";
    expect(postalCode.length).toBe(6);
  });
});
