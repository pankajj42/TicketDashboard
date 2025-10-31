export type CardItem = {
	id: string;
	title: string;
	description?: string;
};

export type Column = {
	id: string;
	title: string;
	items: CardItem[];
};

export const uid = (prefix = "id") =>
	`${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_BOARD: Column[] = [
	{
		id: "proposed",
		title: "Proposed",
		items: [
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
			{ id: uid("c"), title: "Idea: Onboarding flow" },
		],
	},
	{
		id: "todo",
		title: "Todo",
		items: [{ id: uid("c"), title: "Design hero section" }],
	},
	{
		id: "inprogress",
		title: "In Progress",
		items: [{ id: uid("c"), title: "Implement auth" }],
	},
	{
		id: "completed",
		title: "Completed",
		items: [{ id: uid("c"), title: "Project kickoff" }],
	},
	{
		id: "deployed",
		title: "Deployed",
		items: [{ id: uid("c"), title: "Landing page v1" }],
	},
];
