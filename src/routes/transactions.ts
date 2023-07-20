import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/checkSessionIdExists";

export async function transactionsRoutes(app: FastifyInstance) {

	app.get("/",
		{ preHandler: [checkSessionIdExists], }
		, async (request, response) => {
			const { sessionId } = request.cookies;

			const transactions = await knex("transactions")
				.where({ session_id: sessionId })
				.select("*");
			return response.status(200).send(transactions);
		});

	app.get("/:id",
		{ preHandler: [checkSessionIdExists], },
		async (request, response) => {
			const getTransactionParamsSchema = z.object({
				id: z.string().uuid(),
			});
			const { id } = getTransactionParamsSchema.parse(request.params);
			const transaction = await knex("transactions").select("*")
				.where({ id: id })
				.andWhere({ session_id: request.cookies.sessionId })
				.first();
			if (!transaction) {
				return response.status(404).send();
			}
			return response.status(200).send(transaction);
		});

	app.post("/", async (request, response) => {
		const createTransactionBodySchema = z.object({
			title: z.string(),
			amount: z.number(),
			type: z.enum(["credit", "debit"]),
		});
		const { title, amount, type } = createTransactionBodySchema.parse(request.body);
		let sessionId = request.cookies.sessionId;
		if (!sessionId) {
			sessionId = crypto.randomUUID();
			response.cookie("sessionId", sessionId, {
				path: "/",
				maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
			});
		}
		await knex("transactions").insert({
			id: crypto.randomUUID(),
			title: title,
			amount: type === "credit" ? amount : -amount,
			session_id: sessionId,
		});
		return response.status(201).send();

	});

	app.get("/summary",
		{ preHandler: [checkSessionIdExists]},
		async (request, response) => {
			const summary = await knex("transactions").sum("amount", { as: "amount" }).first();
			return response.status(200).send({ summary });
		});
}