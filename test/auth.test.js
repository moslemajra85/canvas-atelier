import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../src/services/AuthService.js";

test("AuthService stays disabled for the anonymous portfolio demo", async () => {
  const auth = new AuthService({ enabled: false, fetchRequest: null });

  assert.equal(auth.configured, false);
  assert.equal(await auth.getSession(), null);
  await assert.rejects(() => auth.signIn("artist@example.com", "long-password"), /not enabled/i);
});

test("AuthService uses same-origin cookies and publishes auth changes", async () => {
  const requests = [];
  const fetchRequest = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).endsWith("session")) return response({ user: null });
    if (String(url).endsWith("logout")) return response(null, 204);
    return response({ user: { id: "user-1", email: "artist@example.com" } });
  };
  const auth = new AuthService({ enabled: true, fetchRequest, apiUrl: "https://atelier.test/api/" });
  const sessions = [];
  auth.onAuthStateChange(session => sessions.push(session));

  assert.equal(await auth.getSession(), null);
  await auth.register("artist@example.com", "long-password");
  await auth.signOut();

  assert.equal(requests[1].options.credentials, "same-origin");
  assert.equal(requests[1].options.method, "POST");
  assert.equal(sessions[0].user.email, "artist@example.com");
  assert.equal(sessions[1], null);
});

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}
