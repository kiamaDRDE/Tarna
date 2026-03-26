"use server";

import { cookies } from "next/headers";
import { getInitials } from "@/src/lib/getInitials";
import { User } from "@/src/types/user";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

type ProfileEditForm = {
	userName?: string;
	fullName?: string;
	phone?: string;
	bio?: string;
};

export type UpdateProfileInput = {
	userId: string;
	token: string | null;
	form: ProfileEditForm;
	currentUser: Pick<User, "id" | "initials" | "online"> | null;
};

export type UpdateProfileResult = {
	success: boolean;
	error: string | null;
	profilePatch?: {
		id?: string;
		username?: string;
		displayName?: string | null;
		phone?: string | null;
		bio?: string | null;
		avatarUrl?: string | null;
		coverUrl?: string | null;
		isVerified?: boolean;
		role?: string;
		status?: string;
		createdAt?: string;
	};
	userPatch?: Partial<User>;
};

export type DeleteProfileInput = {
	userId: string;
	token: string | null;
};

export type DeleteProfileResult = {
	success: boolean;
	error: string | null;
};

export type ChangePasswordInput = {
	token: string | null;
	currentPassword: string;
	newPassword: string;
};

export type ChangePasswordResult = {
	success: boolean;
	error: string | null;
};

function toTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(payload: unknown, fallback: string): string {
	if (!payload || typeof payload !== "object") return fallback;

	const data = payload as { message?: unknown; error?: unknown };

	if (Array.isArray(data.message) && data.message.length > 0) {
		return String(data.message[0]);
	}

	if (typeof data.message === "string" && data.message.trim().length > 0) {
		return data.message;
	}

	if (typeof data.error === "string" && data.error.trim().length > 0) {
		return data.error;
	}

	return fallback;
}

export async function updateProfileAction(
	input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
	const userName = toTrimmedString(input.form.userName);
	const fullName = toTrimmedString(input.form.fullName);
	const phone = toTrimmedString(input.form.phone);
	const bio = toTrimmedString(input.form.bio);

	const payload: Record<string, string> = {};

	if (userName.length > 0) payload.username = userName;
	if (fullName.length > 0) payload.displayName = fullName;
	if (phone.length > 0) payload.phone = phone;
	if (bio.length > 0) payload.bio = bio;

	if (Object.keys(payload).length === 0) {
		return {
			success: false,
			error: "Aucune modification détectée.",
		};
	}

	let token = input.token;
	if (!token) {
		const cookieStore = await cookies();
		token = cookieStore.get("access_token")?.value ?? null;
	}

	if (!token) {
		return {
			success: false,
			error: "Utilisateur non authentifié.",
		};
	}

	try {
		const res = await fetch(`${API_BASE_URL}/users/${input.userId}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		});

		const responseJson = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				success: false,
				error: getErrorMessage(responseJson, "Impossible de modifier le profil."),
			};
		}

		const updated = responseJson as {
			id?: string;
			username?: string;
			displayName?: string | null;
			phone?: string | null;
			bio?: string | null;
			avatarUrl?: string | null;
			coverUrl?: string | null;
			isVerified?: boolean;
			role?: string;
			status?: string;
			createdAt?: string;
		};

		const profilePatch = {
			id: updated.id,
			username: updated.username,
			displayName: updated.displayName ?? null,
			phone: updated.phone ?? null,
			bio: updated.bio ?? null,
			avatarUrl: updated.avatarUrl ?? null,
			coverUrl: updated.coverUrl ?? null,
			isVerified: updated.isVerified,
			role: updated.role,
			status: updated.status,
			createdAt: updated.createdAt,
		};

		const initialsSource =
			profilePatch.displayName ?? profilePatch.username ?? input.currentUser?.initials ?? "";

		const userPatch: Partial<User> = {
			username: profilePatch.username,
			displayName: profilePatch.displayName,
			phone: profilePatch.phone,
			bio: profilePatch.bio,
			avatarUrl: profilePatch.avatarUrl,
			coverUrl: profilePatch.coverUrl,
			isVerified: profilePatch.isVerified,
			role: profilePatch.role,
			status: profilePatch.status,
			createdAt: profilePatch.createdAt,
			initials: getInitials(initialsSource),
			online: input.currentUser?.online ?? true,
		};

		return {
			success: true,
			error: null,
			profilePatch,
			userPatch,
		};
	} catch {
		return {
			success: false,
			error: "Erreur réseau. Impossible de modifier le profil.",
		};
	}
}

export async function deleteProfileAction(
	input: DeleteProfileInput,
): Promise<DeleteProfileResult> {
	let token = input.token;

	if (!token) {
		const cookieStore = await cookies();
		token = cookieStore.get("access_token")?.value ?? null;
	}

	if (!token) {
		return {
			success: false,
			error: "Utilisateur non authentifié.",
		};
	}

	try {
		const res = await fetch(`${API_BASE_URL}/users/${input.userId}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			cache: "no-store",
		});

		const responseJson = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				success: false,
				error: getErrorMessage(responseJson, "Impossible de supprimer le compte."),
			};
		}

		return { success: true, error: null };
	} catch {
		return {
			success: false,
			error: "Erreur réseau. Impossible de supprimer le compte.",
		};
	}
}

export async function changePasswordAction(
	input: ChangePasswordInput,
): Promise<ChangePasswordResult> {
	let token = input.token;

	if (!token) {
		const cookieStore = await cookies();
		token = cookieStore.get("access_token")?.value ?? null;
	}

	if (!token) {
		return {
			success: false,
			error: "Utilisateur non authentifié.",
		};
	}

	if (!input.currentPassword.trim() || !input.newPassword.trim()) {
		return {
			success: false,
			error: "Veuillez remplir tous les champs.",
		};
	}

	const pw = input.newPassword.trim();

	if (pw.length < 8) {
		return {
			success: false,
			error: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
		};
	}

	if (!/[A-Z]/.test(pw)) {
		return {
			success: false,
			error: "Le nouveau mot de passe doit contenir au moins une lettre majuscule.",
		};
	}

	if (!/[a-z]/.test(pw)) {
		return {
			success: false,
			error: "Le nouveau mot de passe doit contenir au moins une lettre minuscule.",
		};
	}

	if (!/\d/.test(pw)) {
		return {
			success: false,
			error: "Le nouveau mot de passe doit contenir au moins un chiffre.",
		};
	}

	try {
		const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				currentPassword: input.currentPassword,
				newPassword: input.newPassword,
			}),
			cache: "no-store",
		});

		const responseJson = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				success: false,
				error: getErrorMessage(
					responseJson,
					"Impossible de changer le mot de passe.",
				),
			};
		}

		return { success: true, error: null };
	} catch {
		return {
			success: false,
			error: "Erreur réseau. Impossible de changer le mot de passe.",
		};
	}
}

