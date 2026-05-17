import { useEffect, useState } from "react";
import { createFileRoute, useNavigate  } from "@tanstack/react-router";
import type { Market } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/market-card";
import { Card, CardContent } from "@/components/ui/card";

function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Array<Market>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "resolved">("active");
  const [sortBy, setSortBy] = useState<"date" | "totalBets" | "participants">("date");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadMarkets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.listMarkets(status, sortBy, page);
      setMarkets(data.markets);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 5000);
    return () => clearInterval(interval);
  }, [status, sortBy, page]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">PolyPredict</h1>
          <p className="text-gray-600 mb-8 text-xl font-medium">Predict the future, earn rewards.</p>
          <div className="space-x-4">
            <Button size="lg" className="rounded-full shadow-lg hover:scale-105 transition-transform" onClick={() => navigate({ to: "/auth/login" })}>Login</Button>
            <Button size="lg" variant="outline" className="rounded-full bg-white/50 backdrop-blur-sm hover:scale-105 transition-transform" onClick={() => navigate({ to: "/auth/register" })}>
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-gray-200 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Explore Markets</h1>
            <p className="text-gray-500 mt-1">Find events to trade on</p>
          </div>
          <Button onClick={() => navigate({ to: "/markets/new" })} className="bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all rounded-full px-6">
            + Create Market
          </Button>
        </div>

       
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              className={`flex-1 sm:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${status === "active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => { setStatus("active"); setPage(1); }}
            >
              Active
            </button>
            <button
              className={`flex-1 sm:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${status === "resolved" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => { setStatus("resolved"); setPage(1); }}
            >
              Resolved
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as "date" | "totalBets" | "participants"); setPage(1); }}
              className="font-medium text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer w-full sm:w-auto"
            >
              <option value="date">Sort by Newest</option>
              <option value="totalBets">Sort by Volume</option>
              <option value="participants">Sort by Participants</option>
            </select>
            <Button variant="outline" size="icon" onClick={() => loadMarkets()} disabled={isLoading} className="shrink-0 h-[42px] w-[42px] rounded-lg">
              <svg className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </Button>
          </div>
        </div>

        
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 mb-6 flex items-center gap-3 shadow-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

      
        {isLoading && markets.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 animate-pulse p-6 flex flex-col">
                <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-md w-5/6 mb-auto"></div>
                <div className="flex justify-between mt-4">
                  <div className="h-8 bg-gray-200 rounded-md w-24"></div>
                  <div className="h-8 bg-gray-200 rounded-md w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <Card className="border-dashed shadow-none bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <p className="text-gray-900 font-semibold text-xl mb-2">No {status} markets found</p>
              {status === "active" && <p className="text-gray-500 font-medium">Be the first to create one!</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8 blur-0 transition-all duration-300">
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>

            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="rounded-full w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-700 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="text-sm font-semibold text-gray-700 bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm min-w-[100px] text-center">
                  Page <span className="text-indigo-600">{page}</span> of {totalPages}
                </div>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="rounded-full w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-700 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
