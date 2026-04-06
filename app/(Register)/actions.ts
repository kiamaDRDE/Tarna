"use server";

import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

// ---------- Types partagés ----------
export type SignupState = {
  success: boolean;
  errors: {
    username?: string;
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  };
};

export type LoginUser = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  role: string;
  status: string;
  createdAt: string;
};

export type LoginState = {
  success: boolean;
  errors: {
    identifier?: string;
    password?: string;
  };
  user?: LoginUser;
  accessToken?: string;
  refreshToken?: string;
  accountDeleted?: boolean;
  maskedEmail?: string;
};

// ---------- Signup action ----------
export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const username = (formData.get("username") as string) ?? "";
  const name = (formData.get("name") as string) ?? "";
  const email = (formData.get("email") as string) ?? "";
  const phone = (formData.get("phone") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = (formData.get("confirm-password") as string) ?? "";

  const errors: SignupState["errors"] = {};

  // Validation
  if (!username.trim()) {
    errors.username = "Username is required.";
  } else if (username.trim().length < 3) {
    errors.username = "Username must be at least 3 characters.";
  }

  if (!name.trim()) {
    errors.name = "Full name is required.";
  }

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^\+?[0-9\s\-()]{7,15}$/.test(phone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (!password) {
    errors.password = "Le mot de passe est requis.";
  } else if (password.length < 8) {
    errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Le mot de passe doit contenir au moins une majuscule.";
  } else if (!/[a-z]/.test(password)) {
    errors.password = "Le mot de passe doit contenir au moins une minuscule.";
  } else if (!/\d/.test(password)) {
    errors.password = "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        email: email,
        phone: phone,
        password: password,
        displayName: name,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        errors: { email: data?.message ?? "Signup failed. Please try again." },
      };
    }

    return { success: true, errors: {} };
  } catch {
    return {
      success: false,
      errors: { email: "An error occurred. Please try again." },
    };
  }
}

// ---------- Login action ----------
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = (formData.get("identifier") as string) ?? "";
  const password = (formData.get("password") as string) ?? "";

  const errors: LoginState["errors"] = {};

  if (!identifier.trim()) {
    errors.identifier = "L'email ou le nom d'utilisateur est requis.";
  }

  if (!password) {
    errors.password = "Le mot de passe est requis.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);

      // Compte supprimé — proposer la récupération
      if (res.status === 403 && data?.code === "ACCOUNT_DELETED") {
        return {
          success: false,
          errors: {},
          accountDeleted: true,
          maskedEmail: data.maskedEmail ?? "",
        };
      }

      return {
        success: false,
        errors: { identifier: data?.message ?? "Identifiants invalides." },
      };
    }

    const data = await res.json();

    //  Stockage du token en cookie HTTP-only
    const cookieStore = await cookies();
    cookieStore.set("access_token", data.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 jour
    });

    return {
      success: true,
      errors: {},
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  } catch {
    return {
      success: false,
      errors: { identifier: "Une erreur est survenue. Veuillez réessayer." },
    };
  }
}

// ---------- Recovery types ----------
export type RecoveryState = {
  success: boolean;
  error?: string;
  maskedEmail?: string;
};

// ---------- Request account recovery action ----------
export async function requestRecoveryAction(
  identifier: string,
  password: string,
): Promise<RecoveryState> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/request-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok) {
      return {
        success: true,
        maskedEmail: data?.maskedEmail ?? "",
      };
    }

    return {
      success: false,
      error: data?.message ?? "Une erreur est survenue.",
    };
  } catch {
    return {
      success: false,
      error: "Impossible de contacter le serveur.",
    };
  }
}
