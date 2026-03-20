import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterEach, afterAll } from "@jest/globals";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
    await mongoose.connection.db?.dropDatabase();
});

afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

jest.mock("./src/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  },
}));