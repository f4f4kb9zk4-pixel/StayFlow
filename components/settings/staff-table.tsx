"use client";

import { useState, useTransition } from "react";

import type { StaffMember } from "@/lib/data/staff";
import { updateStaffRole } from "@/lib/actions/settings";
import { DEPARTMENTS, type Department, type UserRole } from "@/types/domain";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { AvatarInitials } from "@/components/shared/avatar-initials";
import { AddUserDialog } from "@/components/settings/add-user-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as UserRole[];

interface StaffTableProps {
  staff: StaffMember[];
  readOnly: boolean;
}

/** User & role management table (§1.7, §3.2 item 11). */
export function StaffTable({ staff, readOnly }: StaffTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Users &amp; roles</CardTitle>
          <CardDescription>Manage staff role and department assignments for this hotel.</CardDescription>
        </div>
        {!readOnly && <AddUserDialog />}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <StaffRow key={member.id} member={member} readOnly={readOnly} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StaffRow({ member, readOnly }: { member: StaffMember; readOnly: boolean }) {
  const [, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(member.role);
  const [department, setDepartment] = useState<string>(member.department ?? "none");

  function onRoleChange(value: string) {
    const next = value as UserRole;
    setRole(next);
    startTransition(() => {
      updateStaffRole(member.id, next, department === "none" ? null : (department as Department));
    });
  }

  function onDepartmentChange(value: string) {
    setDepartment(value);
    startTransition(() => {
      updateStaffRole(member.id, role, value === "none" ? null : (value as Department));
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <AvatarInitials name={member.fullName} size="xs" />
          <span className="truncate">{member.fullName}</span>
        </div>
      </TableCell>
      <TableCell>
        <Select value={role} onValueChange={onRoleChange} disabled={readOnly}>
          <SelectTrigger className="h-8 w-[170px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={department} onValueChange={onDepartmentChange} disabled={readOnly}>
          <SelectTrigger className="h-8 w-[150px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}
