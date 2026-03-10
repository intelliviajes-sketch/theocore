// src/app/traveler/RightWelcome.tsx
"use client";

import LoggedOutView from "@/components/traveler/LoggedOutView";
import LoggedInView from "@/components/traveler/LoggedInView";
import { Toaster } from "react-hot-toast";

// Definición de tipos
interface UserType {
  id: string;
  name: string;
  email: string;
}

interface RightWelcomeProps {
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => Promise<void>;
}

export default function RightWelcome({ user, onLogin, onLogout }: RightWelcomeProps) {
  return (
    <div className="relative w-full h-full ">

      {user ? (
        <LoggedInView
          user={{ name: user.name }}
          onLogout={onLogout}
        />
      ) : (
        <LoggedOutView
          onLogin={onLogin}
        />
      )}


    </div>
  );
}