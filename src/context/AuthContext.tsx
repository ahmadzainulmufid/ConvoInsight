import React from "react";
import type { User } from "firebase/auth";

export const AuthContext = React.createContext<User | null>(null);
