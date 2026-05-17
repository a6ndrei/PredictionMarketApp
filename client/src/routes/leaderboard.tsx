import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { User } from "@/lib/api";
import { api } from "@/lib/api";

import { Badge } from "@/components/ui/badge";

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<Array<User>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        
        <div className="bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl p-10 shadow-lg text-white border-b-4 border-indigo-900/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0l-3.5 10.5L0 12l8.5 3.5L12 24l3.5-8.5L24 12l-8.5-3.5z" /></svg>
          </div>

          <div className="z-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">Top Forecasters</h1>
            <p className="text-indigo-100/90 text-lg font-medium">The most accurate predictors in the ecosystem.</p>
          </div>
          <Badge className="z-10 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/10 px-4 py-2 text-sm">
            Sorted by Total Winnings
          </Badge>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

       
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center p-16">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-500 font-medium text-lg">No forecasters on the board yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="py-4 px-6 text-sm font-bold text-gray-400 tracking-wider uppercase w-16 text-center">Rank</th>
                    <th className="py-4 px-6 text-sm font-bold text-gray-400 tracking-wider uppercase">Forecaster</th>
                    <th className="py-4 px-6 text-sm font-bold text-gray-400 tracking-wider uppercase text-right">Total Winnings</th>
                    <th className="py-4 px-6 text-sm font-bold text-gray-400 tracking-wider uppercase text-right w-32 hidden sm:table-cell">Current Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaderboard.map((user, idx) => {
                    const isTop3 = idx < 3;
                    const rankString = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="py-5 px-6 font-bold text-center">
                          {isTop3 ? (
                            <span className="text-2xl drop-shadow-sm">{rankString}</span>
                          ) : (
                            <span className="text-gray-400 group-hover:text-gray-600 transition-colors">{rankString}</span>
                          )}
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner text-white ${idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600" : idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" : idx === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600" : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{user.username}</p>
                              {user.role === 'admin' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">Admin</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <p className="font-bold text-lg text-emerald-600">
                            ${(user.totalWinnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="py-5 px-6 text-right hidden sm:table-cell">
                          <p className="font-medium text-gray-500">
                            ${(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});
