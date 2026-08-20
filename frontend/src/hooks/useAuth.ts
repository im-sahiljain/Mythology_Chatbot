import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { clearAllLocalSessions, syncUserSessionsFromDb } from '../services/chatStorage';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);
        if (event === 'SIGNED_OUT') {
          clearAllLocalSessions();
          syncUserSessionsFromDb();
        } else if (event === 'SIGNED_IN') {
          clearAllLocalSessions();
          syncUserSessionsFromDb();
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};