import { z } from "zod";

export const TicketStatusEnum = z.enum([
	"PROPOSED",
	"TODO",
	"INPROGRESS",
	"DONE",
	"DEPLOYED",
]);

export const CreateProjectSchema = z.object({
	name: z.string().min(2).max(100),
	description: z.string().max(2000).optional().nullable(),
});

export const CreateTicketSchema = z.object({
	title: z.string().min(2).max(200),
	description: z.string().min(1).max(5000),
});

export const UpdateTicketDetailsSchema = z
	.object({
		title: z.string().min(2).max(200).optional(),
		description: z.string().min(1).max(5000).optional(),
	})
	.refine(
		(v) =>
			typeof v.title !== "undefined" ||
			typeof v.description !== "undefined",
		{
			message: "At least one of title or description is required",
			path: ["title"],
		}
	);

export const ChangeTicketStatusSchema = z.object({
	status: TicketStatusEnum,
});

export const CreateCommentSchema = z.object({
	body: z.string().min(1).max(4000),
});

export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketDetailsInput = z.infer<
	typeof UpdateTicketDetailsSchema
>;
export type ChangeTicketStatusInput = z.infer<typeof ChangeTicketStatusSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
