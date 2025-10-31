import express from "express";
import { title } from "@repo/shared";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get("/api/health", (req, res) => {
	res.json({ status: "OK", data: title });
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
