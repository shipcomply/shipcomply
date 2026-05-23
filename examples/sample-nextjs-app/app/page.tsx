// Sample Next.js app — intentional PII collection for scanner smoke test
// Scanner MUST detect: email, name, phone, address, dob (>=5 types)

export default function SignUpPage() {
  return (
    <main>
      <h1>Create Account</h1>
      <form action="/api/users" method="POST">
        {/* email — DPDP S4, GDPR A13 */}
        <input type="email" name="email" placeholder="Email address" required />

        {/* name — DPDP S4 */}
        <input type="text" name="firstName" placeholder="First name" required />
        <input type="text" name="lastName" placeholder="Last name" required />

        {/* phone — DPDP S4 */}
        <input type="tel" name="phone" placeholder="Phone number" />

        {/* address — DPDP S4 */}
        <input type="text" name="address" placeholder="Street address" />
        <input type="text" name="postalCode" placeholder="PIN code" />

        {/* date of birth — DPDP S4 */}
        <input type="date" name="dateOfBirth" placeholder="Date of birth" />

        <button type="submit">Sign up</button>
        <p>By signing up you agree to our Privacy Policy.</p>
      </form>

      <section>
        <h2>Analytics</h2>
        <p>We use analytics to improve your experience.</p>
      </section>
    </main>
  );
}
