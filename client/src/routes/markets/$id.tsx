import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import type { Market } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

function MarketDetailPage() {
  const { id } = useParams({ from: "/markets/$id" });
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isBetting, setIsBetting] = useState(false);
  const [isAdminAction, setIsAdminAction] = useState(false);
  const [adminResolveOutcome, setAdminResolveOutcome] = useState<number | "">("");

  const marketId = parseInt(id, 10);

  const loadMarket = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data = await api.getMarket(marketId);
      setMarket(data);
      if (data.outcomes.length > 0 && !selectedOutcomeId) {
        setSelectedOutcomeId(data.outcomes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market tracking");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

 
  useEffect(() => {
    loadMarket();
    const interval = setInterval(() => loadMarket(true), 3000);
    return () => clearInterval(interval);
  }, [marketId]);

  const handlePlaceBet = async () => {
    if (!selectedOutcomeId || !betAmount) {
      setError("Please select an outcome and enter a bet amount");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid bet amount greater than 0");
      return;
    }

    if (user && (user.balance ?? 0) < amount) {
      setError(`Insufficient balance. You only have $${user.balance?.toFixed(2) ?? "0.00"} available.`);
      return;
    }

    try {
      setIsBetting(true);
      setError(null);
      await api.placeBet(marketId, selectedOutcomeId, amount);
      setBetAmount("");
      await loadMarket(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet. Try again.");
    } finally {
      setIsBetting(false);
    }
  };

  const handleResolveMarket = async () => {
    if (!adminResolveOutcome) {
      setError("Select an outcome to resolve the market.");
      return;
    }
    try {
      setIsAdminAction(true);
      setError(null);
      await api.resolveMarket(marketId, Number(adminResolveOutcome));
      await loadMarket(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve market.");
    } finally {
      setIsAdminAction(false);
    }
  };

  const handleArchiveMarket = async () => {
    if (!confirm("Are you sure you want to archive this market? All bets will be refunded.")) return;
    try {
      setIsAdminAction(true);
      setError(null);
      await api.archiveMarket(marketId);
      await loadMarket(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive market.");
    } finally {
      setIsAdminAction(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Card className="shadow-lg border-0 bg-white/50 backdrop-blur-md p-6 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <p className="text-gray-600 font-medium text-lg">Please log in to view this market</p>
            <Button size="lg" className="rounded-full shadow-md w-full" onClick={() => navigate({ to: "/auth/login" })}>Login to Continue</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !market) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Card className="border-0 shadow-lg p-6 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="text-gray-900 font-bold text-xl">Market not found or archived</p>
            <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/" })}>← Back to Markets</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const colors = ["from-blue-500 to-indigo-500", "from-emerald-400 to-teal-500", "from-orange-400 to-pink-500", "from-purple-500 to-indigo-600"];

  return (
    <div className="min-h-screen bg-gray-50/50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        <Button variant="ghost" onClick={() => navigate({ to: "/" })} className="text-gray-500 hover:text-gray-900 -ml-4">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Markets
        </Button>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

       
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={market.status === "active" ? "default" : "secondary"} className={`px-4 py-1 rounded-full text-sm font-semibold ${market.status === 'active' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}`}>
                  {market.status.toUpperCase()}
                </Badge>
                <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {market.creator}
                </span>
                <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {new Date(market.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">{market.title}</h1>
              {market.description && (
                <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">{market.description}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center min-w-[180px]">
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">Total Volume</p>
              <p className="text-3xl font-black text-indigo-600">
                ${market.totalMarketBets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* CSS Chart and Voting section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Market Prediction</h3>

              <div className="space-y-4">
                {market.outcomes.map((outcome, idx) => {
                  const gradient = colors[idx % colors.length];
                  const isSelected = selectedOutcomeId === outcome.id;

                  return (
                    <div
                      key={outcome.id}
                      onClick={() => market.status === "active" && setSelectedOutcomeId(outcome.id)}
                      className={`relative overflow-hidden group rounded-2xl border-2 transition-all p-5 cursor-pointer ${isSelected
                          ? "border-indigo-500 ring-4 ring-indigo-50"
                          : market.status === "active"
                            ? "border-gray-100 hover:border-indigo-200 bg-white"
                            : "border-gray-100 bg-gray-50 cursor-default opacity-80"
                        }`}
                    >
                      {/* CSS Progress Bar */}
                      <div className="absolute top-0 left-0 h-full w-full bg-gray-50 -z-10"></div>
                      <div
                        className={`absolute top-0 left-0 h-full -z-10 transition-all duration-1000 ease-out opacity-10 bg-gradient-to-r ${gradient}`}
                        style={{ width: `${Math.max(1, outcome.odds)}%` }}
                      ></div>

                      <div className="flex justify-between items-center z-10">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className={`text-xl font-bold ${isSelected ? "text-indigo-900" : "text-gray-900"}`}>{outcome.title}</h4>
                            {market.status === "resolved" && outcome.odds === 100 && (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded-sm">Winner</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1 font-medium">Vol: ${outcome.totalBets.toFixed(2)}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className={`text-4xl font-black tabular-nums tracking-tight ${isSelected ? "text-indigo-600" : "text-gray-700"}`}>
                              {outcome.odds}%
                            </span>
                          </div>
                          {market.status === "active" && (
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                              {isSelected && <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            
            {isAdmin && market.status === "active" && (
              <div className="bg-orange-50 rounded-3xl p-8 border border-orange-200">
                <div className="flex items-center gap-2 mb-6">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <h3 className="text-xk font-bold text-orange-900">Admin Actions</h3>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl border border-orange-100 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label className="text-orange-900 font-semibold mb-2 block">Resolve Market</Label>
                      <select
                        className="w-full text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500"
                        value={adminResolveOutcome}
                        onChange={(e) => setAdminResolveOutcome(e.target.value ? Number(e.target.value) : "")}
                      >
                        <option value="">Select Winning Outcome...</option>
                        {market.outcomes.map(o => (
                          <option key={o.id} value={o.id}>{o.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:self-end flex-shrink-0 w-full sm:w-auto">
                      <Button
                        onClick={handleResolveMarket}
                        disabled={isAdminAction || !adminResolveOutcome}
                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                      >
                        {isAdminAction ? "Processing..." : "Confirm Final Result"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-orange-200/50">
                    <Button
                      variant="outline"
                      onClick={handleArchiveMarket}
                      disabled={isAdminAction}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      Archive & Refund All Bets
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            
            <div className="sticky top-6">
              {market.status === "active" ? (
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-100/50 border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0l-3.5 10.5L0 12l8.5 3.5L12 24l3.5-8.5L24 12l-8.5-3.5z" /></svg>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Execution Station</h3>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-semibold text-gray-500 mb-1">
                        <span>Selected Option</span>
                      </div>
                      <div className={`p-4 font-bold text-lg rounded-xl border ${selectedOutcomeId ? "bg-indigo-50 border-indigo-200 text-indigo-900" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                        {market.outcomes.find((o) => o.id === selectedOutcomeId)?.title || "Tap an outcome to pick"}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-semibold mb-1">
                        <span className="text-gray-500">Amount</span>
                        <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => setBetAmount(user?.balance?.toString() || "0")}>Max: ${user?.balance?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                        <Input
                          id="betAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="0.00"
                          disabled={isBetting}
                          className="pl-8 text-2xl font-bold h-14 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full text-lg py-7 rounded-xl font-bold bg-gray-900 hover:bg-black shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                      onClick={handlePlaceBet}
                      disabled={isBetting || !selectedOutcomeId || !betAmount}
                    >
                      {isBetting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Executing...
                        </span>
                      ) : "Confirm Stake"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Trading Halted</h3>
                  <p className="text-gray-500 font-medium">This market has been resolved and no longer accepts predictions.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/markets/$id")({
  component: MarketDetailPage,
});
