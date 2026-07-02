const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe("Authentication API", () => {
    
    // 1. SETUP: Connect to the FAKE database before testing starts
    beforeAll(async () => {
        // Notice we are using MONGO_URI_TEST here!
        await mongoose.connect(process.env.MONGO_URI_TEST);
    });

    // 2. CLEANUP: Wipe the database completely clean before every single test
    // This ensures one test doesn't ruin another test!
    beforeEach(async () => {
        await User.deleteMany({});
    });

    // 3. TEARDOWN: Disconnect when all tests are finished so the terminal doesn't freeze
    afterAll(async () => {
        await mongoose.connection.close();
    });

    // ----------------------------------------------------
    // THE ACTUAL TESTS
    // ----------------------------------------------------
    it("should successfully register a new user", async () => {
        // ACT
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123"
            });

        // ASSERT
        expect(response.statusCode).toBe(200);
        expect(response.body.wristband).toBeDefined(); // Make sure we got a JWT token back!
        
        // Double-check the database to ensure the user was actually saved!
        const userInDb = await User.findOne({ email: "test@example.com" });
        expect(userInDb.name).toBe("Test User");
    });

        it("should successfully log in an existing user", async () => {
        
        // 1. ARRANGE: We need a user to exist before we can log in!
        // The easiest way is to just use Supertest to register one right now.
        await request(app)
            .post('/api/auth/register')
            .send({
                name: "Login Tester",
                email: "logintest@example.com",
                password: "mypassword123"
            });

        // 2. ACT: Now, let's try to log in as that exact user
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: "logintest@example.com",
                password: "mypassword123"
            });

        // 3. ASSERT: Did the login work?
        expect(response.statusCode).toBe(200);
        expect(response.body.wristband).toBeDefined(); // We should get a JWT!
    });


});
