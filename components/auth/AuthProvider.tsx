'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getUser, onAuthStateChange } from '@/lib/supabase/auth';
import type { User } from '@supabase/supabase-js';
import { analytics } from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUser().then((user) => {
      setUser(user);
      setIsLoading(false);
      if (user) {
        analytics.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
        });
      }
    });

    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
      if (user) {
        analytics.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
        });
      } else {
        analytics.reset();
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
