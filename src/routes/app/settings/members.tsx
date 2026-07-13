import { usePostHog } from "@posthog/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import {
	Download,
	Filter,
	Mail,
	Save,
	Search,
	Shield,
	UserPlus,
	UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { UserNameLink } from "@/components/user-name-link";
import { useTRPC } from "@/integrations/trpc/react";
import type { TRPCRouter } from "@/integrations/trpc/router";
import { authClient } from "@/lib/auth-client";
import { downloadCsv } from "@/lib/client-export";

export const Route = createFileRoute("/app/settings/members")({
	component: MembersPage,
});

type RouterOutputs = inferRouterOutputs<TRPCRouter>;
type OrganizationMember = RouterOutputs["org"]["listMembers"][number];

const BASE_ROLE_OPTIONS = ["member", "admin", "owner"] as const;
const PAGE_SIZE = 50;

function MembersPage() {
	const trpc = useTRPC();
	const posthog = usePostHog();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const {
		data: members,
		isLoading,
		isError,
		refetch,
	} = useQuery(trpc.org.listMembers.queryOptions());
	const memberList: OrganizationMember[] = members ?? [];
	const [email, setEmail] = useState("");
	const [inviting, setInviting] = useState(false);
	const [inviteError, setInviteError] = useState("");
	const [inviteSuccess, setInviteSuccess] = useState("");
	const [searchValue, setSearchValue] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [draftRoleByMemberId, setDraftRoleByMemberId] = useState<
		Record<string, string>
	>({});
	const [busyMemberAction, setBusyMemberAction] = useState<string | null>(null);
	const [deactivateCandidate, setDeactivateCandidate] =
		useState<OrganizationMember | null>(null);

	const handleInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canManageMembers) {
			setInviteError("Only owners/admins can invite members.");
			return;
		}
		setInviting(true);
		setInviteError("");
		setInviteSuccess("");

		const result = await authClient.organization.inviteMember({
			email,
			role: "member",
		});

		if (result.error) {
			setInviteError(result.error.message ?? "Failed to invite");
			posthog.captureException(
				new Error(result.error.message ?? "Failed to invite"),
			);
		} else {
			posthog.capture("member_invited", {
				invited_email: email,
				role: "member",
			});
			setInviteSuccess(`Invitation created for ${email}`);
			setEmail("");
			await queryClient.invalidateQueries();
		}
		setInviting(false);
	};

	const roleOptions = useMemo(() => {
		const options = new Set<string>(BASE_ROLE_OPTIONS);
		for (const member of memberList) {
			if (member.role) options.add(member.role);
		}
		return Array.from(options);
	}, [memberList]);

	const currentMemberRole = useMemo(() => {
		const self = memberList.find(
			(member) => member.userId === session?.user?.id,
		);
		return self?.role ?? "";
	}, [memberList, session?.user?.id]);

	const canManageMembers = useMemo(() => {
		const roleParts = currentMemberRole
			.split(",")
			.map((part) => part.trim().toLowerCase())
			.filter(Boolean);
		return roleParts.includes("owner") || roleParts.includes("admin");
	}, [currentMemberRole]);

	const filteredMembers = useMemo(() => {
		const normalizedQuery = searchValue.trim().toLowerCase();
		return memberList.filter((member) => {
			const roleParts = member.role
				.split(",")
				.map((part) => part.trim())
				.filter(Boolean);
			const roleMatch = roleFilter === "all" || roleParts.includes(roleFilter);
			if (!roleMatch) return false;
			if (!normalizedQuery) return true;
			return (
				member.name.toLowerCase().includes(normalizedQuery) ||
				member.email.toLowerCase().includes(normalizedQuery)
			);
		});
	}, [memberList, roleFilter, searchValue]);

	const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
	const clampedPage = Math.min(page, totalPages);
	const pageStart =
		filteredMembers.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1;
	const pageEnd = Math.min(clampedPage * PAGE_SIZE, filteredMembers.length);
	const pagedMembers = useMemo(
		() =>
			filteredMembers.slice(
				(clampedPage - 1) * PAGE_SIZE,
				clampedPage * PAGE_SIZE,
			),
		[filteredMembers, clampedPage],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset page when search/filter changes.
	useEffect(() => {
		setPage(1);
	}, [searchValue, roleFilter]);

	useEffect(() => {
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [page, totalPages]);

	const updateDraftRole = (memberId: string, role: string) => {
		setDraftRoleByMemberId((prev) => ({
			...prev,
			[memberId]: role,
		}));
	};

	const handleSaveRole = async (member: OrganizationMember) => {
		if (!canManageMembers) return;
		const nextRole = draftRoleByMemberId[member.memberId] ?? member.role;
		if (!nextRole || nextRole === member.role) return;
		setBusyMemberAction(`role:${member.memberId}`);
		const result = await authClient.organization.updateMemberRole({
			memberId: member.memberId,
			role: nextRole,
		});
		if (result.error) {
			toast.error("Role update failed", {
				description: result.error.message ?? "Unable to update member role.",
			});
		} else {
			toast.success("Member role updated", {
				description: `${member.name} is now ${nextRole}.`,
			});
			await queryClient.invalidateQueries();
		}
		setBusyMemberAction(null);
	};

	const handleDeactivateMember = async (member: OrganizationMember) => {
		if (!canManageMembers) return;
		setBusyMemberAction(`deactivate:${member.memberId}`);
		const result = await authClient.organization.removeMember({
			memberIdOrEmail: member.memberId,
		});
		if (result.error) {
			toast.error("Deactivate failed", {
				description:
					result.error.message ?? "Unable to remove member from organization.",
			});
			posthog.captureException(
				new Error(
					result.error.message ?? "Unable to remove member from organization.",
				),
			);
		} else {
			posthog.capture("member_deactivated", {
				member_email: member.email,
				member_role: member.role,
			});
			toast.success("Member deactivated", {
				description: `${member.name} no longer has organization access.`,
			});
			await queryClient.invalidateQueries();
			setDeactivateCandidate(null);
		}
		setBusyMemberAction(null);
	};

	const exportRoster = () => {
		downloadCsv(`member-roster-${new Date().toISOString().slice(0, 10)}`, [
			["Name", "Email", "Role", "Can manage organization"],
			...filteredMembers.map((member) => [
				member.name,
				member.email,
				member.role,
				member.canManageOrganization ? "Yes" : "No",
			]),
		]);
		toast.success(
			`Exported ${filteredMembers.length} ${filteredMembers.length === 1 ? "member" : "members"}`,
		);
	};

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-8">
				<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
					Members
				</h1>
				<p className="text-ds-muted text-sm mt-1">
					Invite and manage organization members
				</p>
			</div>

			{/* Invite */}
			<div className="mb-6 border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-4 sm:p-6">
				<div className="flex items-center gap-2 mb-4">
					<UserPlus className="w-4 h-4 text-ds-accent" />
					<span className="text-sm font-extrabold tracking-wide text-ds-accent">
						Invite Member
					</span>
				</div>
				{canManageMembers ? (
					<>
						<form
							onSubmit={handleInvite}
							className="flex flex-col gap-3 sm:flex-row"
						>
							<input
								type="email"
								aria-label="Member email"
								placeholder="colleague@company.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="min-w-0 flex-1 bg-ds-input-bg border-2 border-ds-muted3 rounded-xl px-4 py-2.5 text-ds-fg font-sans text-sm transition-colors placeholder:text-ds-muted2 focus:border-ds-accent focus:outline-none"
							/>
							<button
								type="submit"
								disabled={inviting}
								className="flex w-full shrink-0 items-center justify-center gap-2 bg-ds-accent px-6 py-2.5 text-sm font-extrabold tracking-wide text-ds-accent-fg transition-colors hover:bg-ds-accent-hover disabled:opacity-50 sm:w-auto"
							>
								<Mail className="w-4 h-4" />
								{inviting ? "Sending..." : "Invite"}
							</button>
						</form>
						{inviteError && (
							<p className="mt-2 text-red-400 text-sm font-bold">
								Error: {inviteError}
							</p>
						)}
						{inviteSuccess && (
							<p className="mt-2 text-ds-accent text-sm font-bold">
								Success: {inviteSuccess}
							</p>
						)}
					</>
				) : (
					<div className="text-xs font-bold tracking-wide text-ds-muted">
						Member access: Only owners and admins can invite members.
					</div>
				)}
			</div>

			{/* Members List */}
			<div className="border-2 border-ds-border rounded-2xl bg-ds-surface/60">
				<div className="border-b-2 border-ds-border p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<span className="text-sm font-bold tracking-wide text-ds-muted">
							Current Members ({filteredMembers.length}/{memberList.length})
						</span>
						<button
							type="button"
							onClick={exportRoster}
							disabled={filteredMembers.length === 0}
							className="inline-flex h-9 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-xs font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-50"
						>
							<Download aria-hidden="true" className="h-3.5 w-3.5" />
							Export roster
						</button>
					</div>
					<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ds-muted2" />
							<input
								aria-label="Search members"
								value={searchValue}
								onChange={(event) => setSearchValue(event.target.value)}
								placeholder="Search by name or email..."
								className="w-full border-[2px] border-ds-muted3 bg-ds-input-bg py-2 pl-9 pr-3 text-xs text-ds-fg focus:border-ds-accent focus:outline-none"
							/>
						</div>
						<div className="relative">
							<Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ds-muted2" />
							<NativeSelect
								aria-label="Filter members by role"
								value={roleFilter}
								onChange={(event) => setRoleFilter(event.target.value)}
								className="border-[2px] border-ds-muted3 bg-ds-input-bg py-2 pl-9 text-xs font-bold tracking-wide text-ds-text-secondary focus:border-ds-accent focus:outline-none"
								iconClassName="h-3.5 w-3.5"
							>
								<option value="all">All Roles</option>
								{roleOptions.map((role) => (
									<option key={role} value={role}>
										{role}
									</option>
								))}
							</NativeSelect>
						</div>
					</div>
				</div>
				{isError ? (
					<div role="alert" className="space-y-3 p-6">
						<p className="font-semibold text-red-700 dark:text-red-300">
							Members could not be loaded.
						</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="inline-flex h-9 items-center rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
						>
							Try again
						</button>
					</div>
				) : isLoading ? (
					<div className="p-6">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-10 bg-ds-surface mb-2 animate-pulse" />
						))}
					</div>
				) : filteredMembers.length > 0 ? (
					<div>
						{pagedMembers.map((member) => {
							const isSelf = member.userId === session?.user?.id;
							const selectedRole =
								draftRoleByMemberId[member.memberId] ?? member.role;
							const isSavingRole =
								busyMemberAction === `role:${member.memberId}`;
							const isDeactivating =
								busyMemberAction === `deactivate:${member.memberId}`;
							const isBusy = isSavingRole || isDeactivating;
							return (
								<div
									key={member.memberId}
									className="flex flex-col gap-3 border-b border-ds-border p-4 transition-colors last:border-b-0 hover:bg-ds-surface/50 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="flex items-center gap-3">
										<div className="w-7 h-7 bg-ds-accent text-ds-accent-fg flex items-center justify-center font-extrabold text-[10px]">
											{member.name
												.split(" ")
												.map((n) => n[0])
												.join("")}
										</div>
										<div>
											<UserNameLink
												userId={member.userId}
												name={member.name}
												className="text-sm font-bold"
											/>
											<div className="break-all text-xs text-ds-muted">
												{member.email}
											</div>
										</div>
									</div>
									<div className="flex flex-col gap-2 sm:items-end">
										<div className="flex flex-wrap items-center gap-2 sm:justify-end">
											<div className="inline-flex items-center gap-1 rounded-full border border-ds-accent/35 bg-ds-accent/12 px-3 py-1 text-xs font-semibold text-ds-accent">
												<Shield className="h-3 w-3" />
												{member.role}
												{isSelf ? "• You" : ""}
											</div>
											{canManageMembers ? (
												<>
													<NativeSelect
														aria-label={`Role for ${member.name}`}
														value={selectedRole}
														onChange={(event) =>
															updateDraftRole(
																member.memberId,
																event.target.value,
															)
														}
														disabled={isBusy || isSelf}
														className="border-[2px] border-ds-muted3 bg-ds-input-bg py-1 pl-2 text-[10px] font-bold tracking-wide text-ds-text-secondary focus:border-ds-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
														iconClassName="h-3 w-3"
														iconWrapperClassName="right-2"
													>
														{roleOptions.map((role) => (
															<option key={role} value={role}>
																{role}
															</option>
														))}
													</NativeSelect>
													<button
														type="button"
														aria-label={`Save role for ${member.name}`}
														onClick={() => void handleSaveRole(member)}
														disabled={
															isBusy || isSelf || selectedRole === member.role
														}
														className="inline-flex items-center gap-1 border-[2px] border-ds-muted3 px-2 py-1 text-[10px] font-extrabold tracking-wide text-ds-text-tertiary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:cursor-not-allowed disabled:opacity-50"
													>
														<Save className="h-3 w-3" />
														{isSavingRole ? "Saving..." : "Save role"}
													</button>
													<button
														type="button"
														aria-label={`Deactivate ${member.name}`}
														onClick={() => setDeactivateCandidate(member)}
														disabled={isBusy || isSelf}
														className="inline-flex items-center gap-1 border-[2px] border-red-500/70 px-2 py-1 text-[10px] font-extrabold tracking-wide text-red-500 transition-colors hover:border-red-400 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
													>
														<UserX className="h-3 w-3" />
														{isDeactivating ? "Deactivating..." : "Deactivate"}
													</button>
												</>
											) : null}
										</div>
									</div>
								</div>
							);
						})}
						<div className="flex flex-col gap-2 border-t border-ds-border px-4 py-3 text-[10px] font-bold tracking-wide text-ds-text-tertiary sm:flex-row sm:items-center sm:justify-between">
							<span>
								Showing {pageStart}-{pageEnd} of {filteredMembers.length}
							</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setPage((current) => Math.max(1, current - 1))}
									disabled={clampedPage <= 1}
									className="border-[2px] border-ds-muted3 px-2 py-1 text-[10px] font-extrabold tracking-wide text-ds-text-tertiary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:cursor-not-allowed disabled:opacity-50"
								>
									Prev
								</button>
								<span>
									Page {clampedPage}/{totalPages}
								</span>
								<button
									type="button"
									onClick={() =>
										setPage((current) => Math.min(totalPages, current + 1))
									}
									disabled={clampedPage >= totalPages}
									className="border-[2px] border-ds-muted3 px-2 py-1 text-[10px] font-extrabold tracking-wide text-ds-text-tertiary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:cursor-not-allowed disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="p-6 text-center text-ds-muted text-sm">
						{memberList.length > 0
							? "No members match this filter."
							: "No members yet."}
					</div>
				)}
			</div>

			<Dialog
				open={Boolean(deactivateCandidate)}
				onOpenChange={(open) => {
					if (!open && busyMemberAction === null) setDeactivateCandidate(null);
				}}
			>
				<DialogContent className="border border-ds-border bg-ds-surface">
					<DialogHeader>
						<DialogTitle>Deactivate member?</DialogTitle>
						<DialogDescription className="text-ds-text-secondary">
							{deactivateCandidate
								? `${deactivateCandidate.name} will lose access to this organization. You can invite them again later.`
								: "This member will lose access to the organization."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<button
								type="button"
								disabled={busyMemberAction !== null}
								className="inline-flex h-10 items-center justify-center rounded-xl border border-ds-border bg-ds-input-bg px-4 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
							>
								Cancel
							</button>
						</DialogClose>
						<button
							type="button"
							disabled={!deactivateCandidate || busyMemberAction !== null}
							onClick={() => {
								if (deactivateCandidate) {
									void handleDeactivateMember(deactivateCandidate);
								}
							}}
							className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
						>
							{busyMemberAction?.startsWith("deactivate:")
								? "Deactivating..."
								: "Deactivate member"}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
