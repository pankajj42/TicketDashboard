import jwt from "jsonwebtoken";
import config from "../config/env.js";

export interface JwtPayload {
	userId: string;
	email: string;
	isAdmin: boolean;
}

export class JwtService {
	static generateUserToken(payload: JwtPayload): string {
		try {
			return jwt.sign({ ...payload, isAdmin: false }, config.JWT_SECRET);
		} catch (error) {
			console.log(`Error generating user token:, ${error}`);
			throw new Error("Failed to generate token");
		}
	}

	static generateAdminToken(payload: JwtPayload): string {
		try {
			return jwt.sign(
				{ ...payload, isAdmin: true },
				config.ADMIN_JWT_SECRET
			);
		} catch (error) {
			console.log(`Error generating admin token:, ${error}`);
			throw new Error("Failed to generate admin token");
		}
	}

	static verifyUserToken(token: string): JwtPayload | null {
		try {
			const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
			if (!payload || payload.isAdmin == true) {
				throw new Error("Invalid user token");
			}
			return payload;
		} catch (error) {
			console.log(`Invalid user token: ${error}`);
			return null;
		}
	}

	static verifyAdminToken(token: string): JwtPayload | null {
		try {
			const payload = jwt.verify(
				token,
				config.ADMIN_JWT_SECRET
			) as JwtPayload;
			if (!payload || payload.isAdmin == false) {
				throw new Error("Invalid admin token");
			}
			return payload;
		} catch (error) {
			console.log(`Invalid admin token: ${error}`);
			return null;
		}
	}
}
