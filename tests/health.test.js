const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

function mockRequest(app, method, url) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    };

    let statusCode = 200;
    let responseBody = null;
    const resHeaders = {};

    const res = {
      statusCode: 200,
      setHeader(k, v) {
        resHeaders[k.toLowerCase()] = String(v);
      },
      getHeader(k) {
        return resHeaders[k.toLowerCase()];
      },
      removeHeader(k) {
        delete resHeaders[k.toLowerCase()];
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        resolve({ status: statusCode, body: responseBody, headers: resHeaders });
        return this;
      },
      send(data) {
        responseBody = data;
        resolve({ status: statusCode, body: responseBody, headers: resHeaders });
        return this;
      },
    };

    app.handle(req, res);
  });
}

describe("Health & Root Endpoint Suite", () => {
  test("1. GET /health returns neutral brand message and status UP", async () => {
    const res = await mockRequest(app, "GET", "/health");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      message: "SigSignature API is running",
      status: "UP",
    });
    // Ensure no legacy ERP name leaked
    assert.ok(!JSON.stringify(res.body).includes("ERP"));
  });

  test("2. GET / (root) returns identical neutral health message and status UP", async () => {
    const res = await mockRequest(app, "GET", "/");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      message: "SigSignature API is running",
      status: "UP",
    });
    assert.ok(!JSON.stringify(res.body).includes("ERP"));
  });
});
