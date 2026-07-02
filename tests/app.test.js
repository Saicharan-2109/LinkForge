const request = require('supertest');
const app = require('../server');

describe("Testing the Health Route", () => {
    
    it("should return the welcome message with a 200 status code", async () => {
        // We changed this to hit /api/health instead of /
        const response = await request(app).get('/api/health');

        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('The Forge is hot and running! 🔥');
    });

});
