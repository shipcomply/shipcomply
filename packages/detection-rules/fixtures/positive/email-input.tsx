// Positive fixture: should trigger the "email" detection rule
// This file must NOT be in a test/ directory or have .test. in the name

export function EmailForm() {
  return (
    <form>
      <input type="email" name="email" placeholder="Enter your email" />
      <button type="submit">Subscribe</button>
    </form>
  );
}
