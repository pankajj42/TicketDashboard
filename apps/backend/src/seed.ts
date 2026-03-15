import dotenv from "dotenv";
import crypto from "crypto";
import { prisma } from "./lib/prisma.js";
import { TicketRepository } from "./repositories/ticket.repository.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { NotificationRepository } from "./repositories/notification.repository.js";
import { TicketStatus, UpdateType } from "./generated/prisma/client.js";

dotenv.config();

const SEED_ON_START = process.env.SEED_ON_START?.toLowerCase() === "true";
const triggerByArg = process.argv.includes("--seed");

async function clearDatabase() {
	console.log("Clearing existing data...");
	await prisma.notification.deleteMany({});
	await prisma.ticketComment.deleteMany({});
	await prisma.ticketUpdate.deleteMany({});
	await prisma.ticket.deleteMany({});
	await prisma.project.deleteMany({});
	await prisma.adminElevation.deleteMany({});
	await prisma.refreshToken.deleteMany({});
	await prisma.user.deleteMany({});
}

async function enforceSeedRunning() {
	if (!SEED_ON_START && !triggerByArg) {
		console.log(
			"SEED_ON_START is not true and --seed flag is not provided; skipping seed data load."
		);
		process.exit(0);
	}
}
async function createUsers() {
	console.log("Creating users...");
	const users = [
		{ username: "arjun1", email: "arjun1@td.local", isActive: true },
		{ username: "neha2", email: "neha2@td.local", isActive: true },
		{ username: "pradeep3", email: "pradeep3@td.local", isActive: true },
		{ username: "kavya4", email: "kavya4@td.local", isActive: true },
		{ username: "siddharth5", email: "siddharth5@td.local", isActive: true },
	];

	return Promise.all(
		users.map((u) =>
			prisma.user.upsert({
				where: { email: u.email },
				create: u,
				update: {
					username: u.username,
					isActive: u.isActive,
				},
			})
		)
	);
}

async function createProjects(users: Array<{ id: string; username: string }>) {
	console.log("Creating projects and subscriptions...");
	const projectsData = [
		{
			name: "Mumbai Data Center Migration",
			description: "Migrate legacy infra to Kubernetes + Terraform, reduce outages by 30%.",
			subscriberUsernames: ["arjun1", "neha2", "pradeep3", "kavya4", "siddharth5"],
		},
		{
			name: "Bengaluru CI/CD Refactor",
			description: "Rewrite build pipelines in GitHub Actions and add semantic release hooks.",
			subscriberUsernames: ["arjun1", "neha2", "pradeep3", "kavya4"],
		},
		{
			name: "Hyderabad Incident Response Dashboard",
			description: "Real-time elevator for production incident tracking and SLA analytics.",
			subscriberUsernames: ["neha2", "kavya4"],
		},
		{
			name: "Chennai AI ChatOps Assistant",
			description: "Build internal bot for Jira ticket triage and status commands via Slack.",
			subscriberUsernames: ["arjun1", "neha2", "pradeep3", "kavya4", "siddharth5"],
		},
		{
			name: "Learning AI/ML",
			description: "Create study guides and hands-on labs for machine learning fundamentals.",
			subscriberUsernames: ["arjun1", "neha2", "pradeep3"],
		},
		{
			name: "AI Fit App",
			description: "Develop a personalized AI-powered fitness coaching app.",
			subscriberUsernames: ["kavya4", "siddharth5", "arjun1"],
		},
	];
	const projects = await Promise.all(
		projectsData.map((p) =>
			prisma.project.upsert({
				where: { name: p.name },
				create: { name: p.name, description: p.description },
				update: { description: p.description },
			})
		)
	);

	for (const project of projects) {
		const config = projectsData.find((p) => p.name === project.name);
		const subscriberIds = users
			.filter((u) => config?.subscriberUsernames.includes(u.username))
			.map((u) => ({ id: u.id }));

		if (subscriberIds.length > 0) {
			await prisma.project.update({
				where: { id: project.id },
				data: {
					subscribers: { connect: subscriberIds },
				},
			});
		}

		await NotificationRepository.createForRecipients(
			subscriberIds.map((subscriber) => ({
				recipientId: subscriber.id,
				message: `[${project.name}] project has been created and is now available for tickets.`,
				projectCreatedId: project.id,
			}))
		);
	}

	return projects;
}

async function createRefreshTokens(users: Array<{ id: string }>) {
	console.log("Creating refresh tokens...");
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
	for (const user of users) {
		let created = false;
		let attempt = 0;
		while (!created && attempt < 5) {
			attempt += 1;
			const token = crypto.randomUUID();
			try {
				await prisma.refreshToken.create({
					data: {
						token,
						userId: user.id,
						sessionId: `seed-session-${user.id}`,
						deviceName: "Seed Script",
						userAgent: "seed/1.0",
						ipAddress: "127.0.0.1",
						expiresAt,
					},
				});
				created = true;
			} catch (error: unknown) {
				const err = error as { code?: string };
				if (err.code === "P2002") {
					console.warn(`Token collision for ${token}, retrying (${attempt})`);
					continue;
				}
				throw error;
			}
		}
		if (!created) {
			throw new Error(`Unable to create refreshToken for user ${user.id} after 5 attempts`);
		}
	}
}

type TicketFixture = {
	title: string;
	description: string;
	project: { id: string; name: string };
	createdBy: { id: string; username: string };
	assignedTo: { id: string; username: string };
	statusFlow: TicketStatus[];
	comments: Array<{ author: { id: string; username: string }; body: string }>;
};

type SeedTicketEntry = {
	title: string;
	description: string;
	status: TicketStatus;
	comments: string[];
};

type ProjectTicketPlan = {
	name: string;
	tickets: SeedTicketEntry[];
};

async function seedTickets(
	users: Array<{ id: string; username: string }>,
	projects: Array<{ id: string; name: string }>
) {
	console.log("Seeding tickets, updates, comments, and notifications...");
	const statusProgression: Record<TicketStatus, TicketStatus[]> = {
		PROPOSED: [],
		TODO: ["TODO"],
		INPROGRESS: ["TODO", "INPROGRESS"],
		DONE: ["TODO", "INPROGRESS", "DONE"],
		DEPLOYED: ["TODO", "INPROGRESS", "DONE", "DEPLOYED"],
	};

	const projectTicketPlans: ProjectTicketPlan[] = [
		{
			name: "Mumbai Data Center Migration",
			tickets: [
				{ title: "Migrate Firewal Policy Config to Terraform", description: "Ensure all firewalls are codified, audited and reproducible.", status: "TODO", comments: ["Need to verify rules in staging", "Edge case for IP ranges in APAC"] },
				{ title: "Lift and shift DB replicas to Kubernetes", description: "Move existing Postgres replicas into K8s statefulsets with managed PVCs.", status: "INPROGRESS", comments: ["Initial PV binding working", "Need storage classes for hot data"] },
				{ title: "Build network segmentation topology", description: "Design and deploy VPC segment boundaries for compute and storage tiers.", status: "TODO", comments: ["Draft topology diagram ready", "Security review needed"] },
				{ title: "Automate DNS failover between regions", description: "Implement health-based DNS failover for critical endpoints.", status: "DEPLOYED", comments: ["Monitoring alerts are in place"] },
				{ title: "Migrate vault secrets into HashiCorp Vault", description: "Secure secrets in central vault with rotating tokens.", status: "DONE", comments: ["Rotation scripts passed test"] },
				{ title: "Implement database backup retention policy", description: "Add 30-day backup snapshot policy with monthly archival.", status: "TODO", comments: ["Confirm retention with compliance team"] },
				{ title: "Set up zero-touch autoscaling for node pools", description: "Deploy autoscaler and test scale up/down conditions.", status: "INPROGRESS", comments: ["Threshold values tuned"] },
				{ title: "Create runbook for rack PDU failure", description: "Document recovery steps and run drills.", status: "PROPOSED", comments: ["Need cross-team owner"] },
				{ title: "Reduce application downtime during branch cutovers", description: "Introduce blue/green deployment for core APIs.", status: "DONE", comments: ["Cutover success reports generated"] },
				{ title: "Update compliance manifest for SOC2 control", description: "Write controls narrative for network access restrictions.", status: "INPROGRESS", comments: ["Control owner reviewed draft"] },
			],
		},
		{
			name: "Bengaluru CI/CD Refactor",
			tickets: [
				{ title: "Replace Jenkins jobs with GitHub Actions", description: "Move all pipeline tasks to workflows in monorepo.", status: "DONE", comments: ["Legacy pipeline removed"] },
				{ title: "Add dynamic environment branch deploys", description: "Build preview URL generation for feature branches.", status: "INPROGRESS", comments: ["Testing on staging branch"] },
				{ title: "Normalize linting across services", description: "Standardize ESLint/Prettier presets and fix violations.", status: "TODO", comments: ["Waiting for new standard to be published"] },
				{ title: "Implement PR gating with security scanner", description: "Add Snyk scan to pull request checks.", status: "TODO", comments: ["Token issue with external API"] },
				{ title: "Reduce build time for backend service", description: "Cache deps and parallelize TypeScript compilation.", status: "PROPOSED", comments: ["Need baseline metrics"] },
				{ title: "Add pipeline notifications to Teams", description: "Notify dev team on deploy status and failures.", status: "DONE", comments: ["Integrated via webhook"] },
				{ title: "Implement staged secrets rollout", description: "Use secret manager API for staged secrets.", status: "INPROGRESS", comments: ["Token TTL adjusted"] },
			],
		},
		{
			name: "Chennai AI ChatOps Assistant",
			tickets: [
				{ title: "Build Slack command for ticket lookup", description: "Allow `/ticket <id>` and `/assigned` commands.", status: "DONE", comments: ["Command response latency under 200ms"] },
				{ title: "Design webhook to notify on incident keywords", description: "ChatOps bot posts incidents with on-call tag.", status: "INPROGRESS", comments: ["NLP model edgecases to refine"] },
				{ title: "Add natural language intent parsing", description: "Use simple LLM intent recognizer for ticket triage.", status: "TODO", comments: ["Review model cost"] },
				{ title: "Create GUI for admin workflow approvals", description: "Allow admins to approve tickets via a popup.", status: "PROPOSED", comments: ["Design wireframes ready"] },
			],
		},
		{
			name: "Hyderabad Incident Response Dashboard",
			tickets: [
				{ title: "Implement first responder paging integration", description: "Add SMS/Email push for Sev1 incidents.", status: "INPROGRESS", comments: ["Service provider API key verified"] },
				{ title: "Add SLA breach forecast chart", description: "Predict SLA risk with current open incident load.", status: "TODO", comments: ["Data model design pending"] },
				{ title: "On-call rotation scheduler import", description: "Import team schedules from CSV.", status: "DONE", comments: ["Validation logic complete"] },
			],
		},
		{
			name: "Learning AI/ML",
			tickets: [
				{ title: "Define curriculum for supervised learning module", description: "Create exercises around regression and classification.", status: "TODO", comments: ["Need instructor review"] },
				{ title: "Build interactive notebook for model evaluation", description: "Include bias, variance, and confusion matrix analysis.", status: "PROPOSED", comments: ["Dataset selection in progress"] },
				{ title: "Add model interpretability dashboard", description: "Visualize feature importance and SHAP values.", status: "INPROGRESS", comments: ["UI mockups ready"] },
				{ title: "Integrate dataset versioning with DVC", description: "Setup DVC pipeline for training datasets.", status: "DONE", comments: ["Baseline datasets tracked"] },
				{ title: "Create performance benchmarks for ML training", description: "Benchmark across CPU/GPU runners.", status: "DONE", comments: ["Report complete"] },
			],
		},
		{
			name: "AI Fit App",
			tickets: [
				{ title: "Design workout recommendation engine", description: "Personalize routine based on user fitness profile.", status: "INPROGRESS", comments: ["Need API integration with user goals"] },
				{ title: "Implement daily fitness digest via push", description: "Send daily summary and goals progress.", status: "TODO", comments: ["Push service credentials pending"] },
				{ title: "Add heart rate anomaly detection", description: "Trigger alerts for abnormal heart rate during exercises.", status: "TODO", comments: ["Need test telemetry data"] },
			],
		},
	];

	let globalIndex = 0;
	for (const projectPlan of projectTicketPlans) {
		const project = projects.find((p) => p.name === projectPlan.name);
		if (!project) continue;

		const subscribers = await ProjectRepository.getSubscribers(project.id);
		if (subscribers.length === 0) {
			console.warn(`No subscriber found for project ${project.name} so skipping notifications.`);
			continue;
		}

		for (const ticketDef of projectPlan.tickets) {
			const status = ticketDef.status;
			const creator = users[globalIndex % users.length]!;
			const assignee = users[(globalIndex + 1) % users.length]!;
			const title = ticketDef.title;
			const description = ticketDef.description;
			const statusFlow = statusProgression[status] ?? [];

			const { ticket, lastUpdateId } = await TicketRepository.createWithAudit(
					project.id,
					creator.id,
					title,
					description
				);

				await NotificationRepository.createForRecipients(
					subscribers.map((r) => ({
						recipientId: r.id,
						message: `[${project.name}] New ticket created by ${creator.username}: ${title}`,
						ticketUpdateId: lastUpdateId,
					}))
				);

				if (assignee.id !== creator.id) {
					const assignUpdate = await TicketRepository.changeAssigneeWithAudit(
						ticket.id,
						creator.id,
						assignee.id
					);
					await NotificationRepository.createForRecipients(
						subscribers.map((r) => ({
							recipientId: r.id,
							message: `[${project.name}] ${title} assigned to ${assignee.username} by ${creator.username}`,
							ticketUpdateId: assignUpdate.lastUpdateId,
						}))
					);
				}

			for (const nextStatus of statusFlow) {
					const actorId = nextStatus === "TODO" ? creator.id : assignee.id;
					const statusUpdate = await TicketRepository.changeStatusWithAudit(
						ticket.id,
						actorId,
						nextStatus,
						assignee.id
					);
					await NotificationRepository.createForRecipients(
						subscribers.map((r) => ({
							recipientId: r.id,
							message: `[${project.name}] ${title} status changed to ${nextStatus} by ${
								actorId === creator.id ? creator.username : assignee.username
							} `,
							ticketUpdateId: statusUpdate.lastUpdateId,
						}))
					);
				}

				const commentCount = status === "PROPOSED" ? 1 : 2;
				for (let c = 0; c < commentCount; c += 1) {
					const commentAuthor = users[(globalIndex + c + 2) % users.length]!;
					const body = `Seed comment ${c + 1} by ${commentAuthor.username} on ${title}`;
					const commentEntry = await prisma.ticketComment.create({
						data: {
							ticket: { connect: { id: ticket.id } },
							author: { connect: { id: commentAuthor.id } },
							body,
						},
					});
					const commentUpdate = await prisma.ticketUpdate.create({
						data: {
							ticket: { connect: { id: ticket.id } },
							updatedBy: { connect: { id: commentAuthor.id } },
							type: UpdateType.COMMENT,
							content: JSON.stringify({ comment: body }),
						},
					});
					await NotificationRepository.createForRecipients(
						subscribers.map((r) => ({
							recipientId: r.id,
							message: `[${project.name}] Comment by ${commentAuthor.username}: ${body}`,
							ticketUpdateId: commentUpdate.id,
						}))
					);
				}

				globalIndex += 1;
			}
		}
	}

async function createAdminActivity(admin: { id: string }) {
	console.log("Creating admin elevation data...");
	const now = new Date();
	const expiration = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
	await prisma.adminElevation.create({
		data: {
			user: { connect: { id: admin.id } },
			sessionId: "seed-admin-session",
			jti: "seed-admin-jti",
			expiresAt: expiration,
			ipAddress: "127.0.0.1",
			userAgent: "seed-script/1.0",
		},
	});
	await prisma.user.update({
		where: { id: admin.id },
		data: {
			adminElevatedSessionId: "seed-admin-session",
			adminElevatedUntil: expiration,
		},
	});
}

async function main() {
	try {
		await enforceSeedRunning();
		await clearDatabase();
		const users = await createUsers();
		const projects = await createProjects(users);
		await createRefreshTokens(users);
		await seedTickets(users, projects);
		const admin = users.find((u) => u.username === "arjun1");
		if (admin) {
			await createAdminActivity(admin);
		}
		console.log("Seed data complete.");
	} catch (error) {
		console.error("Seed failed:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
