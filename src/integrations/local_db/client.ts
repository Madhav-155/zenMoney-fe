// Local DB Client Adapter
// This file acts as a drop-in adapter that routes all requests to the Express backend (local PostgreSQL).

const API_URL = import.meta.env.VITE_LOCAL_DB_API_URL || 'http://localhost:5000';

let authListeners: Array<(event: string, session: any) => void> = [];

const triggerAuthStateChange = (event: string, session: any) => {
  console.log("Triggering auth state change:", event, session ? "Session active" : "No session");
  authListeners.forEach(cb => {
    try {
      cb(event, session);
    } catch (e) {
      console.error("Error in auth listener:", e);
    }
  });
};

class PostgrestQueryBuilder {
  private table: string;
  private queryMethod: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: Array<{ type: 'eq' | 'gte'; field: string; value: any }> = [];
  private orderBy: { field: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    if (this.queryMethod !== 'insert' && this.queryMethod !== 'update' && this.queryMethod !== 'delete') {
      this.queryMethod = 'select';
    }
    return this;
  }

  insert(values: any) {
    this.queryMethod = 'insert';
    this.payload = values;
    return this;
  }

  update(values: any) {
    this.queryMethod = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.queryMethod = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderBy = { field, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    // Already returning single object from backend when requested via route
    return this;
  }

  // To support chainable thenable / promise execution
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (error) {
      if (onrejected) return onrejected(error);
      throw error;
    }
  }

  private async execute() {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${API_URL}/api/${this.table}`;
    let method = 'GET';
    let body: string | undefined = undefined;

    if (this.queryMethod === 'insert') {
      method = 'POST';
      body = JSON.stringify(this.payload);
    } else if (this.queryMethod === 'update') {
      method = 'PUT';
      // Profiles and subscriptions have specific route endpoints /api/profile/:id and /api/subscriptions/:id
      const idFilter = this.filters.find(f => f.field === 'id' && f.type === 'eq');
      if (this.table === 'profiles' && idFilter) {
        url = `${API_URL}/api/profile/${idFilter.value}`;
      } else if (this.table === 'subscriptions' && idFilter) {
        url = `${API_URL}/api/subscriptions/${idFilter.value}`;
      }
      body = JSON.stringify(this.payload);
    } else if (this.queryMethod === 'delete') {
      method = 'DELETE';
      const idFilter = this.filters.find(f => f.field === 'id' && f.type === 'eq');
      if (idFilter) {
        url = `${API_URL}/api/${this.table}/${idFilter.value}`;
      }
    } else {
      // select queries
      const params = new URLSearchParams();
      const userIdFilter = this.filters.find(f => (f.field === 'user_id' || f.field === 'id') && f.type === 'eq');
      
      if (this.table === 'profiles' && userIdFilter) {
        url = `${API_URL}/api/profile/${userIdFilter.value}`;
      } else {
        if (userIdFilter) {
          params.append('userId', userIdFilter.value);
        }
        if (this.limitCount !== null) {
          params.append('limit', this.limitCount.toString());
        }
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
    }

    try {
      const response = await fetch(url, { method, headers, body });
      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.message || 'API request failed' } };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error("API Fetch Error:", err);
      return { data: null, error: { message: err.message || 'Network connection failed' } };
    }
  }
}

export const localDb = {
  auth: {
    async changePassword({ currentPassword, newPassword }: any) {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (!response.ok) {
          return { error: { message: data.message || 'Password update failed' } };
        }
        return { error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Network connection failed' } };
      }
    },

    async resetPasswordForEmail({ email, newPassword }: any) {
      try {
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword })
        });
        const data = await response.json();
        if (!response.ok) {
          return { error: { message: data.message || 'Password reset failed' } };
        }
        return { error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Network connection failed' } };
      }
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (!response.ok) {
          return { data: null, error: { message: data.message || 'Login failed' } };
        }

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        const session = { access_token: data.token, user: data.user };
        triggerAuthStateChange('SIGNED_IN', session);

        return { data: { session, user: data.user }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Login network error' } };
      }
    },

    async signUp({ email, password, options }: any) {
      try {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            display_name: options?.data?.display_name,
            username: options?.data?.username
          })
        });
        const data = await response.json();

        if (!response.ok) {
          return { data: null, error: { message: data.message || 'Signup failed' } };
        }

        // Return user to let components know it was created
        return { data: { user: data.user }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Signup network error' } };
      }
    },

    async signOut() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      triggerAuthStateChange('SIGNED_OUT', null);
      return { error: null };
    },

    async getSession() {
      const token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('auth_user');
      if (token && userJson) {
        const user = JSON.parse(userJson);
        return { data: { session: { access_token: token, user } }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    onAuthStateChange(callback: any) {
      authListeners.push(callback);
      
      // Instantly invoke with current state
      const token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('auth_user');
      if (token && userJson) {
        const user = JSON.parse(userJson);
        callback('SIGNED_IN', { access_token: token, user });
      } else {
        callback('SIGNED_OUT', null);
      }

      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners = authListeners.filter(cb => cb !== callback);
            }
          }
        }
      };
    }
  },

  rpc(name: string, args?: any) {
    return {
      then: async (onfulfilled?: (value: any) => any) => {
        try {
          let url = '';
          if (name === 'is_username_available') {
            url = `${API_URL}/api/auth/check-username?val=${encodeURIComponent(args?.username_to_check || '')}`;
          } else if (name === 'is_email_available') {
            url = `${API_URL}/api/auth/check-email?val=${encodeURIComponent(args?.email_to_check || '')}`;
          } else {
            return onfulfilled ? onfulfilled({ data: null, error: { message: 'RPC not implemented' } }) : { data: null };
          }

          const response = await fetch(url);
          const resData = await response.json();
          
          if (!response.ok) {
            const result = { data: null, error: { message: resData.message || 'RPC check failed' } };
            if (onfulfilled) return onfulfilled(result);
            return result;
          }
          
          const result = { data: resData.available, error: null };
          
          if (onfulfilled) return onfulfilled(result);
          return result;
        } catch (err: any) {
          const result = { data: null, error: { message: err.message || 'RPC check failed' } };
          if (onfulfilled) return onfulfilled(result);
          return result;
        }
      }
    };
  },

  functions: {
    async invoke(name: string, options?: any) {
      try {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/functions/${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(options?.body || {})
        });
        const data = await response.json();
        
        if (!response.ok) {
          return { data: null, error: { message: data.message || 'Function execution failed' } };
        }
        
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message || 'Function invocation failed' } };
      }
    }
  },

  from(table: string) {
    return new PostgrestQueryBuilder(table);
  }
};
