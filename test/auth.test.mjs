import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "./helpers/client.mjs";
import { wipeState, bootstrapAdmin, createActivatedUser } from "./helpers/game.mjs";

beforeEach(wipeState);

test("first-ever login on an empty app bootstraps that account as admin", async () => {
  const client = createClient();
  const res = await client.post("/api/auth/login", {
    username: "alice",
    password: "correcthorse",
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.username, "alice");
  assert.equal(res.data.user.isAdmin, true);
  assert.equal(res.data.user.mustChangePassword, false);

  const me = await client.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.data.user.username, "alice");
  assert.equal(me.data.user.isAdmin, true);
});

test("bootstrap requires a 6+ character password", async () => {
  const client = createClient();
  const res = await client.post("/api/auth/login", { username: "shortpw", password: "abc" });
  assert.equal(res.status, 401);
  assert.match(res.data.error, /6\+ characters|choose a password/i);
});

test("a brand-new username with no pre-created account is rejected once an admin already exists", async () => {
  await bootstrapAdmin("existing-admin-3");
  const client = createClient();
  const res = await client.post("/api/auth/login", {
    username: "nobody-created-me",
    password: "whatever123",
  });
  assert.equal(res.status, 404);
  assert.match(res.data.error, /ask your admin/i);
});

test("wrong password on an existing account is rejected", async () => {
  await bootstrapAdmin("wrongpw-admin-4", "correcthorse123");
  const client = createClient();
  const res = await client.post("/api/auth/login", {
    username: "wrongpw-admin-4",
    password: "nope",
  });
  assert.equal(res.status, 401);
  assert.match(res.data.error, /wrong password/i);
});

test("logout destroys the session", async () => {
  const client = createClient();
  await client.post("/api/auth/login", { username: "alice", password: "correcthorse" });
  let me = await client.get("/api/auth/me");
  assert.equal(me.data.user.username, "alice");

  const out = await client.post("/api/auth/logout");
  assert.equal(out.status, 200);

  me = await client.get("/api/auth/me");
  assert.equal(me.data.user, null);
});

test("unauthenticated requests to a protected route are rejected", async () => {
  const client = createClient();
  const res = await client.get("/api/state");
  assert.equal(res.status, 401);
});

test("admin-created accounts require a password change on first login", async () => {
  const admin = await bootstrapAdmin("bob-admin");
  const createRes = await admin.client.post("/api/admin/create-user", { username: "newbie" });
  assert.equal(createRes.status, 200);
  assert.equal(typeof createRes.data.tempPassword, "string");
  assert.ok(createRes.data.tempPassword.length >= 8);

  const newbie = createClient();
  const loginRes = await newbie.post("/api/auth/login", {
    username: "newbie",
    password: createRes.data.tempPassword,
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.user.mustChangePassword, true);

  const me = await newbie.get("/api/auth/me");
  assert.equal(me.data.user.mustChangePassword, true);
});

test("change-password rejects a wrong current password, accepts a correct one", async () => {
  const admin = await bootstrapAdmin("carol-admin");
  const createRes = await admin.client.post("/api/admin/create-user", { username: "dave" });
  const temp = createRes.data.tempPassword;

  const dave = createClient();
  await dave.post("/api/auth/login", { username: "dave", password: temp });

  const wrong = await dave.post("/api/auth/change-password", {
    currentPassword: "totally-wrong",
    newPassword: "brandnewpassword",
  });
  assert.equal(wrong.status, 401);
  assert.match(wrong.data.error, /current password is wrong/i);

  const right = await dave.post("/api/auth/change-password", {
    currentPassword: temp,
    newPassword: "brandnewpassword",
  });
  assert.equal(right.status, 200);
  assert.equal(right.data.user.mustChangePassword, false);

  const me = await dave.get("/api/auth/me");
  assert.equal(me.data.user.mustChangePassword, false);

  // old temp password no longer works
  const staleClient = createClient();
  const staleLogin = await staleClient.post("/api/auth/login", {
    username: "dave",
    password: temp,
  });
  assert.equal(staleLogin.status, 401);
});

test("create-user rejects duplicate usernames and non-admin callers", async () => {
  const admin = await bootstrapAdmin("erin-admin");
  await createActivatedUser(admin.client, "frank");

  const dupe = await admin.client.post("/api/admin/create-user", { username: "frank" });
  assert.equal(dupe.status, 400);
  assert.match(dupe.data.error, /already taken/i);

  const frank = createClient();
  await frank.post("/api/auth/login", {
    username: "frank",
    password: "frankRealPass123",
  });
  const notAdmin = await frank.post("/api/admin/create-user", { username: "ghost" });
  assert.equal(notAdmin.status, 403);
});

test("admin reset-password issues a new temp password and invalidates the old one", async () => {
  const admin = await bootstrapAdmin("gina-admin");
  const { client: harry, password: oldPassword } = await createActivatedUser(admin.client, "harry");

  const resetRes = await admin.client.post("/api/admin/reset-password", { username: "harry" });
  assert.equal(resetRes.status, 200);
  const newTemp = resetRes.data.tempPassword;
  assert.notEqual(newTemp, oldPassword);

  const staleAttempt = createClient();
  const staleLogin = await staleAttempt.post("/api/auth/login", {
    username: "harry",
    password: oldPassword,
  });
  assert.equal(staleLogin.status, 401);

  const freshAttempt = createClient();
  const freshLogin = await freshAttempt.post("/api/auth/login", {
    username: "harry",
    password: newTemp,
  });
  assert.equal(freshLogin.status, 200);
  assert.equal(freshLogin.data.user.mustChangePassword, true);

  void harry; // the pre-reset client isn't reused after this point
});

test("reset-password on an unknown user is rejected", async () => {
  const admin = await bootstrapAdmin("ivy-admin");
  const res = await admin.client.post("/api/admin/reset-password", { username: "does-not-exist" });
  assert.equal(res.status, 400);
});
