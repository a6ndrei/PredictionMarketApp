import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProfilePage() {
  const { isAuthenticated, user, refreshUser } = useAuth() as any;
  const navigate = useNavigate();
  const [bets, setBets] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [page, setPage] = useState(1);
  const [showApiToken, setShowApiToken] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadBets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getUserBets(status, page);
        setBets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load betting history");
      } finally {
        setIsLoading(false);
      }
    };

    loadBets();
  }, [status, page, isAuthenticated]);

  const handleGenerateApiKey = async () => {
    try {
      setGeneratingKey(true);
      const res = await api.generateApiKey();
      if (refreshUser) await refreshUser();
      setShowApiToken(true);
      alert(`API Key generated: ${res.apiToken}\nPlease save it. It won't be shown again in plain text.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate API Key");
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = () => {
    if (user?.apiToken) {
      navigator.clipboard.writeText(user.apiToken);
      alert("API Key copied to clipboard.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Card className="shadow-lg p-6 rounded-2xl w-full max-w-sm text-center">
          <h2 className="text-xl font-bold mb-4">Auth Required</h2>
          <Button className="w-full rounded-full" onClick={() => navigate({ to: "/auth/login" })}>Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Profile Info */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left transition-all hover:shadow-md">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-inner">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-4xl font-extrabold text-gray-900">{user?.username}</h1>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 px-3 py-1">Role: {user?.role}</Badge>
              <Badge variant="secondary" className="px-3 py-1">Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</Badge>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 min-w-[200px] border border-gray-100 text-center shadow-sm">
            <p className="text-sm text-gray-500 font-semibold mb-1">Available Balance</p>
            <p className="text-3xl font-black text-emerald-600">${user?.balance?.toFixed(2) || "0.00"}</p>
          </div>
        </div>

        
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Developer API Key</h2>
              <p className="text-gray-500">Generate an API key to access PolyPredict programmatically.</p>
            </div>
            <Button
              onClick={handleGenerateApiKey}
              className="rounded-full shrink-0 shadow-md"
              disabled={generatingKey}
            >
              {user?.apiToken ? "Regenerate Key" : "Generate API Key"}
            </Button>
          </div>

          {user?.apiToken && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <code className="text-sm font-mono text-gray-800 break-all select-all">
                  {showApiToken ? user.apiToken : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                </code>
                <button onClick={() => setShowApiToken(!showApiToken)} className="text-gray-400 hover:text-gray-600 ml-4 p-2">
                  {showApiToken ? "Hide" : "Show"}
                </button>
              </div>
              <Button variant="outline" onClick={copyToClipboard} className="h-auto shrink-0 border-gray-200 hover:bg-gray-50 rounded-xl">Copy</Button>
            </div>
          )}
        </div>

        
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Betting History</h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${status === "active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => { setStatus("active"); setPage(1); }}
              >
                Active
              </button>
              <button
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${status === "resolved" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => { setStatus("resolved"); setPage(1); }}
              >
                Resolved
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 mb-6 font-medium">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : bets.length === 0 ? (
            <div className="text-center py-24 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-500 font-medium text-lg mb-2">No {status} bets found.</p>
              <Button variant="link" onClick={() => navigate({ to: "/" })} className="text-indigo-600 font-semibold">Explore Markets</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bets.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-gray-50/50 transition-colors gap-4">
                  <div className="flex-1">
                    <Link to="/markets/$id" params={{ id: item.market.id.toString() }} className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.market.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 block"></span>
                        {item.outcome.title}
                      </p>
                      <span className="text-gray-300">•</span>
                      <p className="text-sm text-gray-400">{new Date(item.bet.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-medium mb-0.5">Staked Amount</p>
                      <p className="font-bold text-gray-900">${item.bet.amount.toFixed(2)}</p>
                    </div>
                    {status === "resolved" && (
                      <div className="text-right border-l pl-6 border-gray-100">
                        <p className="text-sm text-gray-500 font-medium mb-0.5">Result</p>
                        {item.market.resolvedOutcomeId === item.outcome.id ? (
                          <p className="font-bold text-emerald-600">Won</p>
                        ) : item.market.resolvedOutcomeId === null ? (
                          <p className="font-bold text-gray-500">Refunded</p>
                        ) : (
                          <p className="font-bold text-red-500">Loss</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full shadow-sm">Previous</Button>
                <span className="text-sm font-medium text-gray-500">Page {page}</span>
                <Button variant="outline" disabled={bets.length < 20} onClick={() => setPage(page + 1)} className="rounded-full shadow-sm">Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});
