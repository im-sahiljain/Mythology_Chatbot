import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { purgeAllSessions } from '../services/chatStorage';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) {
        purgeAllSessions();
      }
      setLoading(false);
    });

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (event === 'SIGNED_OUT' || !u) {
          purgeAllSessions();
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};