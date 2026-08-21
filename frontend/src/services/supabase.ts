import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ [Supabase Client Warning] Supabase credentials missing!");
} else {
  console.log(
    `🔐 [Supabase Client Initialized] Connected to URL: ${supabaseUrl}`,
  );
}

class NodeWebSocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  constructor() {}
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
}

const getWebSocketTransport = () => {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket as any;
  }
  return NodeWebSocketStub as any;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: getWebSocketTransport(),
  },
});
