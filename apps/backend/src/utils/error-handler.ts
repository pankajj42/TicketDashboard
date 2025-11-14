import { Response } from "express";
import { z } from "zod";
import { ERROR_CODES, type ApiErrorResponse } from "@repo/shared";
import { logger } from "../lib/logger.js";

export class ErrorHandler {
	/**
	 * Handle validation errors from Zod
	 */
	static handleValidationError(
		res: Response<ApiErrorResponse>,
		error: z.ZodError
	): void {
		const message =
			"Invalid request data; " +
			error.issues.map((issue) => issue?.message || "").join("; ");
		res.status(400).json({
			error: message,
			code: ERROR_CODES.VALIDATION_ERROR,
			details: error.issues,
		});
	}

	/**
	 * Handle authentication errors
	 */
	static handleAuthError(
		res: Response<ApiErrorResponse>,
		message: string,
		code: string = ERROR_CODES.AUTH_ERROR
	): void {
		res.status(401).json({
			error: message,
			code,
		});
	}

	/**
	 * Handle not found errors
	 */
	static handleNotFoundError(
		res: Response<ApiErrorResponse>,
		message: string
	): void {
		res.status(404).json({
			error: message,
			code: ERROR_CODES.NOT_FOUND,
		});
	}

	/**
	 * Handle bad request errors
	 */
	static handleBadRequestError(
		res: Response<ApiErrorResponse>,
		message: string,
		code: string = ERROR_CODES.BAD_REQUEST,
		details?: unknown
	): void {
		res.status(400).json({
			error: message,
			code,
			...(details !== undefined ? { details } : {}),
		});
	}

	/**
	 * Handle internal server errors
	 */
	static handleInternalError(
		res: Response<ApiErrorResponse>,
		message: string = "Internal server error"
	): void {
		res.status(500).json({
			error: message,
			code: ERROR_CODES.INTERNAL_ERROR,
		});
	}

	/**
	 * Handle rate limit errors
	 */
	static handleRateLimitError(
		res: Response<ApiErrorResponse>,
		timeLeft: number
	): void {
		res.status(429).json({
			error: `Too many attempts. Try again in ${timeLeft} seconds.`,
			code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
		});
	}

	/**
	 * Generic error handler that determines the type of error
	 */
	static handleError(
		res: Response<ApiErrorResponse>,
		error: unknown,
		operation: string
	): void {
		if (error instanceof z.ZodError) {
			this.handleValidationError(res, error);
			return;
		}

		if (error instanceof Error) {
			// Handle specific error types
			if (
				error.message.includes("TOKEN_EXPIRED") ||
				error.message.includes("EXPIRED")
			) {
				this.handleAuthError(
					res,
					"Token expired",
					ERROR_CODES.TOKEN_EXPIRED
				);
				return;
			}

			if (
				error.message.includes("INVALID") ||
				error.message.includes("UNAUTHORIZED")
			) {
				this.handleAuthError(
					res,
					"Invalid credentials",
					ERROR_CODES.INVALID_CREDENTIALS
				);
				return;
			}

			if (error.message.includes("NOT_FOUND")) {
				this.handleNotFoundError(res, "Resource not found");
				return;
			}
		}

		// Log unexpected errors for debugging
		logger.error(`${operation} error`, { error });
		this.handleInternalError(res, `Failed to ${operation}`);
	}
}
