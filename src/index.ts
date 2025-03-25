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
            `SELECT * FROM airQuality WHERE YEAR(timestamp) = ? AND MONTH(timestamp) = ? AND DAY(timestamp) = ?`,
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
                `SELECT *,
            CASE
                WHEN device_name = 'tongdy_1' THEN (co2 * 0.922144) + 220.8915
                WHEN device_name = 'tongdy_2' THEN (co2 * 1.11773) - 97.9053
                WHEN device_name = 'tongdy_3' THEN (co2 * 1.070889) - 2.3568
                WHEN device_name = 'tongdy_4' THEN (co2 * 1.123171) - 57.9253
                ELSE co2
            END AS adjust_co2
            FROM tongdy 
            WHERE YEAR(timestamp) = ? 
            AND MONTH(timestamp) = ? 
            AND DAY(timestamp) = ?`, [year, month, day]
            );


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

fastify.get<{ Params: UserParams }>('/api/download/selected/:year/:month/:day',
    {
        schema: {
            params: paramsSchema
        }
    }, async (request, reply) => {
        try {
            const { year, month, day } = request.params;
            const [data] = await pool.query(
                `SELECT *,
            CASE
                WHEN device_name = 'tongdy_1' THEN (co2 * 0.922144) + 220.8915
                WHEN device_name = 'tongdy_2' THEN (co2 * 1.11773) - 97.9053
                WHEN device_name = 'tongdy_3' THEN (co2 * 1.070889) - 2.3568
                WHEN device_name = 'tongdy_4' THEN (co2 * 1.123171) - 57.9253
                ELSE co2
            END AS adjust_co2
            FROM tongdy 
            WHERE YEAR(timestamp) = ? 
            AND MONTH(timestamp) = ? 
            AND DAY(timestamp) = ?`, [year, month, day]
            );


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
