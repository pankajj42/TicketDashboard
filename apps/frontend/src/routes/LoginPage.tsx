import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import LogoIcon from "@/components/logo";
import EmailInput from "@/components/auth/EmailInput";
import OtpInput from "@/components/auth/OtpInput";
import Timer from "@/components/auth/Timer";
import { AUTH_CONFIG } from "@/lib/constants";

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
					{step === "email" ? (
						<div className="space-y-4">
							<EmailInput
								value={email}
								onChange={setEmail}
								onEnterKey={handleSendOtp}
								placeholder="Enter your email"
								disabled={isLoading}
								error={error || undefined}
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
						<div className="space-y-6">
							<div className="text-center space-y-2">
								<p className="text-sm text-muted-foreground">
									Code sent to{" "}
									<span className="font-medium">{email}</span>
								</p>
								<Timer
									initial={
										AUTH_CONFIG.OTP_EXPIRY_MINUTES * 60
									}
									onExpire={() => {
										setStep("email");
										setOtp("");
									}}
									className="justify-center"
								/>
							</div>

							<div className="space-y-4">
								<div className="flex justify-center">
									<OtpInput
										value={otp}
										onChange={setOtp}
										length={AUTH_CONFIG.OTP_LENGTH}
										disabled={isLoading}
										autoFocus
									/>
								</div>

								{error && (
									<div className="text-center">
										<p className="text-sm text-destructive">
											{error}
										</p>
									</div>
								)}
							</div>

							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => {
										setStep("email");
										setOtp("");
									}}
									disabled={isLoading}
									className="flex-1"
								>
									Back
								</Button>
								<Button
									onClick={handleVerifyOtp}
									disabled={
										isLoading ||
										otp.length !== AUTH_CONFIG.OTP_LENGTH
									}
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
