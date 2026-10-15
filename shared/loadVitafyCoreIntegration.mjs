import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const corePath = path.resolve(__dirname, "../../vitafy-backend/packages/core/dist/app/integration/index.js");

export const vitafyCoreIntegration = require(corePath);
