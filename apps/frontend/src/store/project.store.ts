import { create } from "zustand";
import { ProjectApiService } from "@/services/project.api";
import { subscribeProject, unsubscribeProject } from "@/lib/realtime";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";

export type ProjectItem = {
	id: string;
	name: string;
	description?: string | null;
	isSubscribed?: boolean;
};

type ViewMode = "BOARD" | "CREATED" | "ASSIGNED";

interface ProjectState {
	projects: ProjectItem[];
	selectedProjectId: string | null;
	viewMode: ViewMode;
	loadingProjects: boolean;
	subscriptionLoading: Record<string, boolean>;
	setSelected: (id: string | null) => void;
	setViewMode: (mode: ViewMode) => void;
	loadProjects: () => Promise<void>;
	toggleSubscribe: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
	projects: [],
	selectedProjectId: null,
	viewMode: "BOARD",
	loadingProjects: false,
	subscriptionLoading: {},
	setSelected: (id) => set({ selectedProjectId: id }),
	setViewMode: (mode) => set({ viewMode: mode }),
	loadProjects: async () => {
		const token = useAuthStore.getState().accessToken;
		if (!token) return;
		set({ loadingProjects: true });
		try {
			const res = await ProjectApiService.list(token);
			set((s) => ({
				projects: res.projects,
				selectedProjectId:
					s.selectedProjectId ?? res.projects[0]?.id ?? null,
				loadingProjects: false,
			}));
		} catch (e) {
			set({ loadingProjects: false });
			return;
		}
	},
	toggleSubscribe: async (projectId: string) => {
		const token = useAuthStore.getState().accessToken;
		if (!token) return;
		const p = get().projects.find((x) => x.id === projectId);
		const subscribed = !!p?.isSubscribed;
		set((s) => ({
			subscriptionLoading: {
				...s.subscriptionLoading,
				[projectId]: true,
			},
		}));
		try {
			if (subscribed) {
				await ProjectApiService.unsubscribe(projectId, token);
				unsubscribeProject(projectId);
				toast.success("Unsubscribed from project");
			} else {
				await ProjectApiService.subscribe(projectId, token);
				subscribeProject(projectId);
				toast.success("Subscribed to project");
			}
		} catch (e) {
			toast.error("Failed to update subscription");
			set((s) => ({
				subscriptionLoading: {
					...s.subscriptionLoading,
					[projectId]: false,
				},
			}));
			return;
		}
		set((s) => ({
			projects: s.projects.map((x) =>
				x.id === projectId ? { ...x, isSubscribed: !subscribed } : x
			),
			subscriptionLoading: {
				...s.subscriptionLoading,
				[projectId]: false,
			},
		}));
	},
}));
