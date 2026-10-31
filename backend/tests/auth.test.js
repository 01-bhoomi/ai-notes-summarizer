const request = require("supertest");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const authRoutes = require("../routes/authRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth API", () => {
  const testEmail = `testuser_${Date.now()}@example.com`;

  it("should signup a new user successfully", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: testEmail,
      password: "password123",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.email).toBe(testEmail);
  });

  it("should not allow signup with an existing email", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User 2",
      email: testEmail,
      password: "password123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should login with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should reject login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "wrongpassword",
    });

    expect(res.statusCode).toBe(400);
  });
});