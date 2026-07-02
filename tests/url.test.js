const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe("URL Shortening API", () => {
    let token = ""; // We will store the wristband here!

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI_TEST);
    });

    beforeEach(async () => {
        await User.deleteMany({});
        
        // 1. STAGEHAND SETUP: Before the test runs, create a user AND log them in!
        await request(app).post('/api/auth/register').send({
            name: "Url Tester",
            email: "urltest@example.com",
            password: "password123"
        });

        const loginRes = await request(app).post('/api/auth/login').send({
            email: "urltest@example.com",
            password: "password123"
        });

        // 2. Grab the wristband from the login response and save it
        token = loginRes.body.wristband; 
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // ----------------------------------------------------
    // THE TESTS
    // ----------------------------------------------------
    it("should fail to shorten a URL if the user has no token", async () => {
        const response = await request(app)
            .post('/api/url/shorten')
            .send({ longUrl: "https://www.google.com" });
            // Notice we didn't attach the token!

        expect(response.statusCode).toBe(401); // 401 Unauthorized!
    });

    it("should successfully shorten a URL if the user is logged in", async () => {
        const response = await request(app)
            .post('/api/url/shorten')
            .set('auth-token', token) // Attach the wristband to the headers!
            .send({ longUrl: "https://www.google.com" });

        expect(response.statusCode).toBe(200);
        expect(response.body.shortUrl).toBeDefined();
        expect(response.body.longUrl).toBe("https://www.google.com");
    });

});
