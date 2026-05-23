// Sample Next.js app — contains intentional PII collection for scanner testing

export default function SignUpPage() {
  return (
    <form action="/api/users" method="POST">
      <h1>Create Account</h1>
      {/* Scanner should detect: email, name, phone */}
      <input type="email" name="email" placeholder="Email address" required />
      <input type="text" name="firstName" placeholder="First name" required />
      <input type="text" name="lastName" placeholder="Last name" required />
      <input type="tel" name="phone" placeholder="Phone number" />
      <button type="submit">Sign up</button>
      <p className="legal">
        By signing up you agree to our Privacy Policy.
      </p>
    </form>
  );
}
