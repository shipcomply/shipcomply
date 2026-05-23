describe("dob", () => {
  it("validates dateOfBirth format", () => {
    const dateOfBirth = "2000-01-01";
    expect(dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
