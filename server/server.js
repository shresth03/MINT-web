import dotenv from "dotenv";

dotenv.config();

const { default: express } = await import("express");
const { default: cors } = await import("cors");
const { default: router } = await import("./routes/index.js");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});