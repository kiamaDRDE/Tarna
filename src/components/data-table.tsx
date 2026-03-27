"use client";
import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconDotsVertical,
  IconGripVertical,
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Tabs, TabsContent } from "@/src/components/ui/tabs";
import { useUserStore } from "../store/userStore";
import { deleteUser, setUserRole, setUserStatus, updateUser } from "../lib/api";
import { CircleAlert, CirclePercent, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { FetchUser } from "../types/user";

export const schema = z.object({
  id: z.string(),
  userName: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
});

type AdminUserNewEvent = {
  id: string;
  username: string;
  displayName?: string | null;
  email: string;
  role: string;
  status: string;
};

// Create a separate component for the drag handle
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <IconGripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function RowActions({
  userId,
  role,
  status,
}: {
  userId: string;
  role: string;
  status: string;
}) {
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmEdit, setConfirmEdit] = React.useState(false);
  const accessToken = useUserStore((state) => state.accessToken);
  const userRole: ("user" | "admin" | "moderator")[] = [
    "admin",
    "moderator",
    "user",
  ];
  const userStatus: ("active" | "restricted" | "suspended" | "deleted")[] = [
    "active",
    "restricted",
    "suspended",
    "deleted",
  ];

  const handleDelete = React.useCallback(async () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await deleteUser(userId, accessToken);
      if (res.ok) toast.success("User deleted successfully");
      else toast.error("Failed to delete user");
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }, [userId, deleteLoading, accessToken]);

  const handleEdit = React.useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (editLoading) return;
      setEditLoading(true);
      try {
        const form = e.currentTarget;
        const formData = new FormData(form);
        const res = await updateUser(userId, accessToken, formData);
        if (res.ok) toast.success("Utilisateur modifier");
        else toast.error("Echec de la modification");
      } finally {
        setEditLoading(false);
        setConfirmEdit(false);
      }
    },
    [userId, editLoading, accessToken],
  );
  const handleSetRole = React.useCallback(
    async (role: "user" | "admin" | "moderator") => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await setUserRole(userId, role, accessToken);
        if (res.ok) toast.success("Role modifier");
        else toast.error("Echec de la modification");
      } finally {
        setLoading(false);
      }
    },
    [userId, loading, accessToken],
  );
  const handleSetStatus = React.useCallback(
    async (status: "active" | "restricted" | "suspended" | "deleted") => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await setUserStatus(userId, status, accessToken);
        if (res.ok) toast.success("Status modifier");
        else toast.error("Echec de la modification");
      } finally {
        setLoading(false);
      }
    },
    [userId, loading, accessToken],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {deleteLoading || loading ? (
            <div>
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">Open menu</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => setConfirmEdit(true)}>
            Éditer
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Éditer rôle</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {userRole.map((el, index) => {
                  if (el === role) {
                    return null;
                  } else {
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => handleSetRole(el)}
                      >
                        {el}
                      </DropdownMenuItem>
                    );
                  }
                })}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Éditer statut</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {userStatus.map((el, index) => {
                  if (el === status) {
                    return null;
                  } else {
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => handleSetStatus(el)}
                      >
                        {el}
                      </DropdownMenuItem>
                    );
                  }
                })}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmDelete(true)}
            variant="destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{"Supprimer l'utilisateur"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {
              "Etes-vous sur de vouloir supprimer cet utilisateur ? Cette action est irreversible."
            }
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmEdit} onOpenChange={setConfirmEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{"Modifier l'utilisateur"}</DialogTitle>
          <DialogDescription>
            {
              "Entrer les nouvelles informations de l'utilisateur. Laissez les champs vides pour ne pas les modifier."
            }
          </DialogDescription>
          <form noValidate onSubmit={handleEdit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="userName">
                  {"Nom d'utilisateur"}
                </FieldLabel>
                <Input
                  id="userName"
                  name="userName"
                  type="text"
                  placeholder="entrer le nom d'utilisateur"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fullName">Nom complet</FieldLabel>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="entrer le nom complet"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="numero">Numéro de téléphone</FieldLabel>
                <Input
                  id="numero"
                  name="phone"
                  type="text"
                  placeholder="+237xxxxxxxx"
                  required
                />
              </Field>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setConfirmEdit(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  type="submit"
                  disabled={editLoading}
                >
                  {editLoading && (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  )}
                  Modifier
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "userName",
    header: "Nom d'utilisateur",
    cell: ({ row }) => {
      return row.original.userName;
    },
    enableHiding: false,
  },
  {
    accessorKey: "fullName",
    header: "Nom complet",
    cell: ({ row }) => {
      return row.original.fullName;
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      return row.original.email;
    },
    enableHiding: false,
  },
  {
    accessorKey: "role",
    header: "Rôle",
    cell: ({ row }) => {
      return row.original.role;
    },
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {row.original.status === "active" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : row.original.status === "restricted" ? (
          <CircleAlert className="fill-orange-500 dark:fill-orange-500" />
        ) : row.original.status === "suspended" ? (
          <CirclePercent className="fill-blue-500 dark:fill-blue-500" />
        ) : (
          <IconCircleXFilled className="fill-red-500 dark:fill-red-500" />
        )}
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RowActions
        userId={row.original.id}
        role={row.original.role}
        status={row.original.status}
      />
    ),
  },
];

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[];
}) {
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const currentUserRole = useUserStore((state) => state.user?.role);
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const handleAdminUserNew = React.useCallback(
    (newUser: AdminUserNewEvent) => {
      if (currentUserRole !== "admin") return;

      const mappedUser: FetchUser = {
        id: newUser.id,
        userName: newUser.username,
        fullName: newUser.displayName ?? "",
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      };

      setData((prev) => {
        if (prev.some((user) => user.id === mappedUser.id)) return prev;
        return [mappedUser, ...prev];
      });
    },
    [currentUserRole],
  );

  useSocketEvent<AdminUserNewEvent>("admin:userNew", handleAdminUserNew);
  useSocketEvent<AdminUserNewEvent>("admin:userNew", () => {
    console.log('nouveau user');
    
  });


  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}
