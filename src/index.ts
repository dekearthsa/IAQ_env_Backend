import Fastify from 'fastify'
import { createPool, Pool } from 'mysql2/promise';
import { Parser } from 'json2csv'
import cors from '@fastify/cors'

const fastify = Fastify({
    logger: false
})

fastify.register(cors, {
    origin: "*",
    methods: ["GET"],
});

const PORT = 3322
interface UserParams {
    year: number;
    month: number;
    day: number;
}

const paramsSchema = {
    type: 'object',
    properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100 },
        month: { type: "integer", minimum: 1, maximum: 12 },
        day: { type: "integer", minimum: 1, maximum: 31 }
    },
    required: ["year", "month", "day"]
}

const resGetAPISchema = {
    200: {
        type: "array",
        items: {
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
            required: ["id", "datetime", "voc", "co2", "ch20", "evoc", "humid", "temp", "pm25", "pm10", "co"]
        }
    },
    404: {
        type: "object",
        properties: {
            error: { type: "string" }
        }
    }
}


const pool: Pool = createPool({
    host: 'localhost',
    database: 'mydatabase',
    user: 'root',
    password: 'rootpassword',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


fastify.get("/debug", (request, reply) => {
    reply.send(`service running status ok!`)
})

fastify.get<{ Params: UserParams }>("/api/selected/:year/:month/:day",
    {
        schema: {
            params: paramsSchema,
            response: resGetAPISchema
        }
    },
    async (request, reply) => {
        const { year, month, day } = request.params;
        const [data] = await pool.query(
            `SELECT * FROM airQuality 
            WHERE 
            YEAR(STR_TO_DATE(datetime_str, '%d/%m/%y %H:%i')) = ? AND
            MONTH(STR_TO_DATE(datetime_str, '%d/%m/%y %H:%i')) = ? AND
            DAY(STR_TO_DATE(datetime_str, '%d/%m/%y %H:%i')) = ?`,
            [year, month, day]
        )

        reply.send(data);
    })

fastify.get<{ Params: UserParams }>('/api/download/selected/:year/:month/:day',
    {
        schema: {
            params: paramsSchema
        }
    }, async (request, reply) => {
        try {
            const { year, month, day } = request.params;
            const [data] = await pool.query(
                `SELECT * FROM airQuality
                WHERE
                YEAR(STR_TO_DATE(datetime_str, '%d/%m/%y %H:%i')) = ?
                AND MONTH(STR_TO_DATE(datetime_str, '%d/%m/%y %H:%i')) = ?
                AND DAY(STR_TO_DATE(datetime_str, '%d/%m/%y %H:%i')) = ?`,
                [year, month, day]
            )

            if (Array.isArray(data) && data.length > 0) {
                const json2csvParser = new Parser();
                const csv = json2csvParser.parse(data);

                reply.header('Content-Type', 'text/csv');
                reply.header('Content-Disposition', `attachment; filename="data_${year}-${month}-${day}.csv"`);

                return reply.send(csv);
            } else {
                return reply.code(404).send({ error: "No data found for the selected date" });
            }
        } catch (err) {
            reply.send("error /api/download/selected " + err)
        }
    })


fastify.listen({ port: PORT }, (err, address) => {
    if (err) throw err
    console.log(`fastify listen port ${PORT}`)
})
