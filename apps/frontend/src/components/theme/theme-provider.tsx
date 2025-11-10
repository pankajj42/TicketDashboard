import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "ui-theme",
	...props
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(() => {
		try {
			const storedTheme = localStorage.getItem(storageKey) as Theme;
			// Validate that the stored theme is one of the valid options
			if (
				storedTheme &&
				["light", "dark", "system"].includes(storedTheme)
			) {
				return storedTheme;
			}
		} catch (error) {
			// Handle cases where localStorage is not available
			console.warn("Failed to read theme from localStorage:", error);
		}
		return defaultTheme;
	});

	useEffect(() => {
		const root = window.document.documentElement;
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const applyTheme = () => {
			root.classList.remove("light", "dark");

			if (theme === "system") {
				const systemTheme = mediaQuery.matches ? "dark" : "light";
				root.classList.add(systemTheme);
				return;
			}

			root.classList.add(theme);
		};

		// Apply theme immediately
		applyTheme();

		// Listen for system theme changes only when theme is "system"
		if (theme === "system") {
			const handleChange = () => applyTheme();
			mediaQuery.addEventListener("change", handleChange);

			return () => {
				mediaQuery.removeEventListener("change", handleChange);
			};
		}
	}, [theme]);

	const value = {
		theme,
		setTheme: (theme: Theme) => {
			try {
				localStorage.setItem(storageKey, theme);
			} catch (error) {
				console.warn("Failed to save theme to localStorage:", error);
			}
			setTheme(theme);
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
