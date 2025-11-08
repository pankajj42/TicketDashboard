import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import LogoIcon from "@/components/logo";

export default function LoginPage() {
	const [step, setStep] = useState("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const navigate = useNavigate();

	const { sendOtp, verifyOtp, isLoading, error, isAuthenticated } = useAuth();

	// Handle redirect in useEffect to avoid infinite renders
	useEffect(() => {
		if (isAuthenticated) {
			navigate("/dashboard", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	// Don't render if already authenticated
	if (isAuthenticated) {
		return null;
	}

	const handleSendOtp = async () => {
		if (!email.trim()) return;
		const success = await sendOtp(email.trim());
		if (success) setStep("otp");
	};

	const handleVerifyOtp = async () => {
		if (!otp || otp.length !== 6) return;
		const success = await verifyOtp(email.trim(), otp);
		if (success) navigate("/dashboard", { replace: true });
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<LogoIcon />
					<CardTitle>Ticket Dashboard</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-red-600 bg-red-50 rounded">
							{error}
						</div>
					)}

					{step === "email" ? (
						<div className="space-y-4">
							<Input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email"
								disabled={isLoading}
							/>
							<Button
								onClick={handleSendOtp}
								disabled={isLoading || !email.trim()}
								className="w-full"
							>
								{isLoading ? "Sending..." : "Send OTP"}
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							<p className="text-sm text-center">
								Code sent to {email}
							</p>
							<Input
								type="text"
								value={otp}
								onChange={(e) =>
									setOtp(
										e.target.value
											.replace(/\D/g, "")
											.slice(0, 6)
									)
								}
								placeholder="000000"
								disabled={isLoading}
								maxLength={6}
								className="text-center"
							/>
							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => setStep("email")}
									disabled={isLoading}
									className="flex-1"
								>
									Back
								</Button>
								<Button
									onClick={handleVerifyOtp}
									disabled={isLoading || otp.length !== 6}
									className="flex-1"
								>
									{isLoading ? "Verifying..." : "Verify"}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
