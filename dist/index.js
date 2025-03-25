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
const json2csv_1 = require("json2csv");
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
        items: {
            type: "object",
            properties: {
                id: { type: "integer" },
                strDatetime: { type: "string" },
                VOC: { type: "number" },
                CO2: { type: "number" },
                CH20: { type: "number" },
                eVOC: { type: "number" },
                Humid: { type: "number" },
                Temp: { type: "number" },
                "PM2.5": { type: "number" },
                PM10: { type: "number" },
                CO: { type: "number" },
            },
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
    const [data] = yield pool.query(`SELECT * FROM airQuality 
            WHERE 
            YEAR(STR_TO_DATE(strDatetime, '%d/%m/%y %H:%i')) = ? AND
            MONTH(STR_TO_DATE(strDatetime, '%d/%m/%y %H:%i')) = ? AND
            DAY(STR_TO_DATE(strDatetime, '%d/%m/%y %H:%i')) = ?`, [year, month, day]);
    reply.send(data);
}));
fastify.get('/api/download/selected/:year/:month/:day', {
    schema: {
        params: paramsSchema
    }
}, (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { year, month, day } = request.params;
        const [data] = yield pool.query(`SELECT * FROM airQuality
                WHERE
                YEAR(STR_TO_DATE(strDatetime, '%d/%m/%y %H:%i')) = ?
                AND MONTH(STR_TO_DATE(strDatetime, '%d/%m/%y %H:%i')) = ?
                AND DAY(STR_TO_DATE(strDatetime, '%d/%m/%y %H:%i')) = ?`, [year, month, day]);
        if (Array.isArray(data) && data.length > 0) {
            const json2csvParser = new json2csv_1.Parser();
            const csv = json2csvParser.parse(data);
            reply.header('Content-Type', 'text/csv');
            reply.header('Content-Disposition', `attachment; filename="data_${year}-${month}-${day}.csv"`);
            return reply.send(csv);
        }
        else {
            return reply.code(404).send({ error: "No data found for the selected date" });
        }
    }
    catch (err) {
        reply.send("error /api/download/selected " + err);
    }
}));
fastify.listen({ port: PORT }, (err, address) => {
    if (err)
        throw err;
    console.log(`fastify listen port ${PORT}`);
});
