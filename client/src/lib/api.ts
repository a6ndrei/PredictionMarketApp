const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";


export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved";
  creator?: string;
  outcomes: Array<MarketOutcome>;
  totalMarketBets: number;
  createdAt: string;
}

export interface MarketOutcome {
  id: number;
  title: string;
  odds: number;
  totalBets: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  token?: string;
  role?: string;
  balance?: number;
  totalWinnings?: number;
  apiToken?: string;
  createdAt: string;
}

export interface Bet {
  id: number;
  userId: number;
  marketId: number;
  outcomeId: number;
  amount: number;
  createdAt: string;
}


class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new Error(errorMessage);
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data ?? {};
  }

  
  async register(username: string, email: string, password: string): Promise<User> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<User> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }


  async listMarkets(status: "active" | "resolved" = "active", sort: "date" | "totalBets" | "participants" = "date", page: number = 1): Promise<{ markets: Array<Market>, totalCount: number, totalPages: number, page: number }> {
    return this.request(`/api/markets?status=${status}&sort=${sort}&page=${page}`);
  }

  async getMarket(id: number): Promise<Market> {
    return this.request(`/api/markets/${id}`);
  }

  async createMarket(title: string, description: string, outcomes: Array<string>): Promise<Market> {
    return this.request("/api/markets", {
      method: "POST",
      body: JSON.stringify({ title, description, outcomes }),
    });
  }

 
  async placeBet(marketId: number, outcomeId: number, amount: number): Promise<Bet> {
    return this.request(`/api/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }

  
  async resolveMarket(marketId: number, outcomeId: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcomeId }),
    });
  }

  async archiveMarket(marketId: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/markets/${marketId}/archive`, {
      method: "POST",
    });
  }


  async getMe(): Promise<User> {
    return this.request(`/api/users/me`);
  }

  async getUserBets(status: "active" | "resolved" = "active", page: number = 1): Promise<Array<any>> {
    return this.request(`/api/users/me/bets?status=${status}&page=${page}`);
  }

  async generateApiKey(): Promise<{ apiToken: string }> {
    return this.request(`/api/users/me/api-key`, {
      method: "POST",
    });
  }

  async getLeaderboard(): Promise<Array<User>> {
    return this.request(`/api/users/leaderboard`);
  }
}

export const api = new ApiClient(API_BASE_URL);
