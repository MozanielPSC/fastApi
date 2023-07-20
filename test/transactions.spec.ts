import { beforeAll, afterAll, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { execSync } from "child_process";

describe("Transactions routes", () => {
	beforeAll(async () => {
		await app.ready();
	});

	beforeEach(async () => {
		execSync("npm run knex migrate:rollback --all");
		execSync("npm run knex migrate:latest");
	});

	afterAll(async () => {
		await app.close();
	});
	it("Should be able to create a new transaction", async () => {
		await request(app.server)
			.post("/transactions")
			.send({
				title: "Salário",
				amount: 5000,
				type: "credit",
			}).expect(201);
	});
	it("Should be able to list the transactions", async () => {
		const response = await request(app.server)
			.post("/transactions")
			.send({
				title: "Salário",
				amount: 5000,
				type: "credit",
			}).expect(201);
		const setCookie = response.headers["set-cookie"];

		const transactions = await request(app.server)
			.get("/transactions")
			.set("Cookie", setCookie);
		expect(transactions.body).toEqual(
			[
				expect.objectContaining({
					title: "Salário",
					amount: 5000,
				})
			]
		);
	});
	it("Should be able to get a single transaction", async () => {
		const response = await request(app.server)
			.post("/transactions")
			.send({
				title: "Salário",
				amount: 5000,
				type: "credit",
			}).expect(201);
		const setCookie = await response.headers["set-cookie"];
		const getTransactions = await request(app.server).get("/transactions").set("Cookie", setCookie);
		const transactionId = getTransactions.body[0].id;
		const transactionResponse = await request(app.server).get(`/transactions/${transactionId}`).set("Cookie", setCookie);
		expect(transactionResponse.body).toEqual(
			expect.objectContaining({
				title: "Salário",
				amount: 5000,
			})
		);
	});

	it("Should be able to get a resume ", async () => {
		const response = await request(app.server)
			.post("/transactions")
			.send({
				title: "Salário",
				amount: 5000,
				type: "credit",
			}).expect(201);
		await request(app.server)
			.post("/transactions")
			.send({
				title: "Salário",
				amount: 2000,
				type: "credit",
			}).expect(201);
		const setCookie = await response.headers["set-cookie"];
		const summaryResponse = await request(app.server).get("/transactions/summary").set("Cookie", setCookie);
		expect(summaryResponse.body.summary).toEqual({
			amount : 7000,
		});
	});

});

