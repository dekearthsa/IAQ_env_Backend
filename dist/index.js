"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const promise_1 = require("mysql2/promise");
// import { Parser } from 'json2csv'
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify = (0, fastify_1.default)({
    logger: false
});
fastify.register(cors_1.default, {
    origin: "*",
    methods: ["GET"],
});
const PORT = 3322;
const paramsSchema = {
    type: 'object',
    properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100 },
        month: { type: "integer", minimum: 1, maximum: 12 },
        day: { type: "integer", minimum: 1, maximum: 31 }
    },
    required: ["year", "month", "day"]
};
const resGetAPISchema = {
    200: {
        type: "array",
        item: {
            type: "object",
            properties: {
                id: { type: "integer" },
                datetime: { type: "string" },
                voc: { type: "number" },
                co2: { type: "number" },
                ch20: { type: "number" },
                evoc: { type: "number" },
                humid: { type: "number" },
                temp: { type: "number" },
                pm25: { type: "number" },
                pm10: { type: "number" },
                co: { type: "number" },
            },
            require: [
                "id", "datetime", "voc", "co2", "ch20", "evoc", "humid",
                "temp", "pm25", "pm10", "co"
            ]
        }
    },
    404: {
        type: "object",
        properties: {
            error: { type: "string" }
        }
    }
};
const pool = (0, promise_1.createPool)({
    host: 'localhost',
    database: 'mydatabase',
    user: 'root',
    password: 'rootpassword',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
fastify.get("/debug", (request, reply) => {
    reply.send(`service running status ok!`);
});
fastify.get("/api/selected/:year/:month/:day", {
    schema: {
        params: paramsSchema,
        response: resGetAPISchema
    }
}, (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { year, month, day } = request.params;
    const [data] = yield pool.query(`SELECT * FROM airQuality WHERE YEAR(timestamp) = ? AND MONTH(timestamp) = ? AND DAY(timestamp) = ?`, [year, month, day]);
    reply.send(data);
}));
fastify.listen({ port: PORT }, (err, address) => {
    if (err)
        throw err;
    console.log(`fastify listen port ${PORT}`);
});
