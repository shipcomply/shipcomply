// Negative fixture: must NOT trigger the "email" detection rule
// because this is a test file (*.test.tsx)

describe("EmailForm", () => {
  it("renders email input", () => {
    const email = "test@example.com";
    expect(email).toContain("@");
  });
});
