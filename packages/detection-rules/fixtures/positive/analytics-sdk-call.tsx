import mixpanel from "mixpanel-browser";
export function trackSignup(email: string) {
  mixpanel.identify(email);
  mixpanel.track("Signup", { email });
}
