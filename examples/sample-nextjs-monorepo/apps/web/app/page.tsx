// Monorepo sample: scanner must detect Next.js inside apps/web/
export default function MonorepoSignup() {
  return (
    <form>
      <input type="email" name="email" placeholder="Work email" />
      <input type="text" name="userName" placeholder="Full name" />
      <input type="tel" name="phone" placeholder="Phone" />
      <button type="submit">Join</button>
    </form>
  );
}
