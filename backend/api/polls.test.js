const request = require("supertest");
const app = require("../../app");
const { db, User, Poll, PollOption } = require("../../database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

describe("Polls API", () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await db.sync({ force: true });

    // Create test user
    testUser = await User.create({
      username: "testuser",
      passwordHash: User.hashPassword("password123"),
    });

    // Generate JWT token
    authToken = jwt.sign(
      {
        id: testUser.id,
        username: testUser.username,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
  });

  afterAll(async () => {
    await db.close();
  });

  describe("POST /api/polls", () => {
    it("creates a poll with valid data", async () => {
      const response = await request(app)
        .post("/api/polls")
        .set("Cookie", `token=${authToken}`)
        .send({
          title: "Test Poll",
          description: "Test Description",
          options: ["Option 1", "Option 2", "Option 3"],
        });

      expect(response.status).toBe(201);
      expect(response.body.poll).toHaveProperty("id");
      expect(response.body.poll.title).toBe("Test Poll");
      expect(response.body.poll.options).toHaveLength(3);
      expect(response.body.poll.shareId).toBeDefined();
    });

    it("requires authentication", async () => {
      const response = await request(app).post("/api/polls").send({
        title: "Test Poll",
        options: ["Option 1", "Option 2"],
      });

      expect(response.status).toBe(401);
    });

    it("requires at least 2 options", async () => {
      const response = await request(app)
        .post("/api/polls")
        .set("Cookie", `token=${authToken}`)
        .send({
          title: "Test Poll",
          options: ["Option 1"],
        });

      expect(response.status).toBe(400);
    });

    it("requires a title", async () => {
      const response = await request(app)
        .post("/api/polls")
        .set("Cookie", `token=${authToken}`)
        .send({
          options: ["Option 1", "Option 2"],
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/polls/my-polls", () => {
    it("returns user's polls", async () => {
      // Create a poll
      await Poll.create({
        title: "My Poll",
        shareId: "test123",
        creatorId: testUser.id,
      });

      const response = await request(app)
        .get("/api/polls/my-polls")
        .set("Cookie", `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.polls).toBeInstanceOf(Array);
    });

    it("requires authentication", async () => {
      const response = await request(app).get("/api/polls/my-polls");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/polls/share/:shareId", () => {
    it("returns poll by share ID", async () => {
      const poll = await Poll.create({
        title: "Public Poll",
        shareId: "public123",
        creatorId: testUser.id,
      });

      await PollOption.create({
        text: "Option 1",
        pollId: poll.id,
        order: 0,
      });

      const response = await request(app).get("/api/polls/share/public123");

      expect(response.status).toBe(200);
      expect(response.body.poll.title).toBe("Public Poll");
    });

    it("returns 404 for non-existent poll", async () => {
      const response = await request(app).get("/api/polls/share/nonexistent");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/polls/:id/close", () => {
    it("closes a poll", async () => {
      const poll = await Poll.create({
        title: "Closable Poll",
        shareId: "close123",
        creatorId: testUser.id,
        isClosed: false,
      });

      const response = await request(app)
        .post(`/api/polls/${poll.id}/close`)
        .set("Cookie", `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.poll.isClosed).toBe(true);
    });

    it("only allows creator to close poll", async () => {
      const otherUser = await User.create({
        username: "otheruser",
        passwordHash: User.hashPassword("password123"),
      });

      const otherToken = jwt.sign(
        {
          id: otherUser.id,
          username: otherUser.username,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const poll = await Poll.create({
        title: "Protected Poll",
        shareId: "protected123",
        creatorId: testUser.id,
      });

      const response = await request(app)
        .post(`/api/polls/${poll.id}/close`)
        .set("Cookie", `token=${otherToken}`);

      expect(response.status).toBe(404);
    });
  });
});
