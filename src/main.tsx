import { NuqsAdapter } from "nuqs/adapters/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");

createRoot(root).render(
	<StrictMode>
		<NuqsAdapter>
			<App />
		</NuqsAdapter>
	</StrictMode>,
);
