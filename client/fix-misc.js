const fs = require("fs");

let apiStr = fs.readFileSync("src/lib/api.ts", "utf8");
apiStr = apiStr.replace(
  "...this.getAuthHeader(),",
  "...(this.getAuthHeader() as Record<string, string>),",
);
fs.writeFileSync("src/lib/api.ts", apiStr);

let lbStr = fs.readFileSync("src/routes/leaderboard.tsx", "utf8");
lbStr = lbStr.replace(
  /import \{ createFileRoute, useNavigate, Link \} from "@tanstack\/react-router";/g,
  'import { createFileRoute, Link } from "@tanstack/react-router";',
);

lbStr = lbStr.replace("const navigate = useNavigate();", "");
fs.writeFileSync("src/routes/leaderboard.tsx", lbStr);

let mrktStr = fs.readFileSync("src/routes/markets/$id.tsx", "utf8");
mrktStr = mrktStr.replace(
  'import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";',
  'import { Card, CardContent } from "@/components/ui/card";',
);
fs.writeFileSync("src/routes/markets/$id.tsx", mrktStr);

let authStr = fs.readFileSync("src/lib/auth-context.tsx", "utf8");
authStr = authStr.replace(
  'localStorage.setItem("auth_token", newUser.token);',
  'localStorage.setItem("auth_token", newUser.token || "");',
);
fs.writeFileSync("src/lib/auth-context.tsx", authStr);
