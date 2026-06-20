"use client";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  Edit3,
  Trash2,
  Plus,
  CalendarClock,
  Users,
  GraduationCap,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import PaginationApi from "@/components/PaginationApi";
import { Input } from "@/components/ui/input";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import PostApi from "@/types/postApi";
import Post from "@/types/post";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import usePagination from "@/lib/usePagination";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import { normalizeSearch } from "@/lib/normalizeSearch";
import PageHeader from "@/components/PageHeader";
import { useSearchParams, useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import ScheduledPost from "@/types/scheduledPost";
import pagination from "@/types/pagination";
import useDateFormatter from "@/lib/useDateFormatter";
import { useListQuery } from "@/lib/useListQuery";
import { Label } from "@/components/ui/label";

// Audience tab type: "parents" | "students"
type AudienceTab = "parents" | "students";

export default function Info() {
  const t = useTranslations("posts");
  const tName = useTranslations("names");
  const tPriority = useTranslations("ThisMessage.Priority");
  const { formatDateTime } = useDateFormatter();
  const { page, setPage, search, setSearch, perPage, handlePerPageChange } =
    usePagination({ persistToUrl: true });

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const { debounced: commitSearch } = useDebouncedCallback(
    (nextValue: string) => {
      setSearch(normalizeSearch(nextValue));
      setPage(1);
    },
    300
  );

  const searchParams = useSearchParams();
  const audienceParam = searchParams?.get("audience");
  const initialAudience: AudienceTab =
    audienceParam === "students" ? "students" : "parents";

  // Audience tab: parents | students
  const [audienceTab, setAudienceTab] = useState<AudienceTab>(initialAudience);

  // Scheduled checkbox toggle
  const [showScheduled, setShowScheduled] = useState(false);

  // Selected items
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [selectedScheduledPosts, setSelectedScheduledPosts] = useState<
    number[]
  >([]);

  const queryClient = useQueryClient();

  // Main posts list — pass audienceTab as a filter param
  const { data } = useListQuery<PostApi>(
    "post/list",
    ["posts", page, search, perPage, audienceTab],
    { page, text: search, perPage, audience: audienceTab }
  );

  interface ScheduledPostsResponse {
    scheduledPosts: ScheduledPost[];
    pagination: pagination;
  }

  // Scheduled posts — only fetch when checkbox is checked
  const { data: scheduledPosts } = useListQuery<ScheduledPostsResponse>(
    "schedule/list",
    ["schedule", page, search, perPage, audienceTab],
    { page, text: search, perPage, audience: audienceTab },
    "GET",
    { enabled: showScheduled }
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();

  const deleteMultiple = useApiMutation<
    { message: string; deletedCount: number },
    { postIds: number[] }
  >(`post/delete-multiple`, "POST", ["posts"], {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        title: t("postDeleted"),
        description: `${data.deletedCount} posts deleted`,
      });
      setSelectedPosts([]);
      setIsDialogOpen(false);
    },
  });

  const deleteMultipleScheduled = useApiMutation<
    { message: string; deletedCount: number },
    { ids: number[] }
  >(`schedule/delete-multiple`, "POST", ["scheduledPosts"], {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
      toast({
        title: t("postDeleted"),
        description: `${data.deletedCount} scheduled posts deleted`,
      });
      setSelectedScheduledPosts([]);
      setIsDialogOpen(false);
    },
  });

  // ── Checkbox helpers ────────────────────────────────────────────────────────

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedPosts((prev) =>
      checked ? [...prev, id] : prev.filter((pid) => pid !== id)
    );
  };

  const handleCheckboxChangeScheduled = (id: number, checked: boolean) => {
    setSelectedScheduledPosts((prev) =>
      checked ? [...prev, id] : prev.filter((pid) => pid !== id)
    );
  };

  const handleSelectAllChange = (checked: boolean) => {
    const allIds = data?.posts?.map((post) => post.id) || [];
    setSelectedPosts((prev) =>
      checked
        ? Array.from(new Set([...prev, ...allIds]))
        : prev.filter((id) => !allIds.includes(id))
    );
  };

  const handleSelectAllChangeScheduled = (checked: boolean) => {
    const allIds =
      scheduledPosts?.scheduledPosts?.map((post: ScheduledPost) => post.id) ||
      [];
    setSelectedScheduledPosts((prev) =>
      checked
        ? Array.from(new Set([...prev, ...allIds]))
        : prev.filter((id) => !allIds.includes(id))
    );
  };

  const isAllSelected = () => {
    const ids = data?.posts?.map((p) => p.id) || [];
    return ids.length > 0 && ids.every((id) => selectedPosts.includes(id));
  };

  const isAllSelectedScheduled = () => {
    const ids =
      scheduledPosts?.scheduledPosts?.map((p: ScheduledPost) => p.id) || [];
    return (
      ids.length > 0 &&
      ids.every((id: number) => selectedScheduledPosts.includes(id))
    );
  };

  // ── Active selection count for the delete button ────────────────────────────
  const activeSelectedCount = showScheduled
    ? selectedScheduledPosts.length
    : selectedPosts.length;

  // ── Column definitions ───────────────────────────────────────────────────────

  const parentPostColumns: ColumnDef<Post>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelected()}
          onCheckedChange={(checked) => handleSelectAllChange(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChange(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
    },
    {
      accessorKey: "title",
      header: t("postTitle"),
      cell: ({ row }) => (
        <div
          title={row.original.title}
          className="truncate max-w-20 sm:max-w-30 md:max-w-40 lg:max-w-60 xl:max-w-60 2xl:max-w-80 block"
        >
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => (
        <div
          title={row.original.description}
          className="truncate max-w-32 sm:max-w-40 md:max-w-50 lg:max-w-60 xl:max-w-70 2xl:max-w-2xl block"
        >
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "admin_name",
      header: t("Admin_name"),
      cell: ({ row }) => tName("name", { ...row?.original?.admin }),
    },
    {
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
    },
    {
      accessorKey: "read_percent",
      header: t("Read_percent"),
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <Link href={`/messages/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
      ),
    },
  ];

  const studentPostColumns: ColumnDef<Post>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelected()}
          onCheckedChange={(checked) => handleSelectAllChange(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChange(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
    },
    {
      accessorKey: "title",
      header: t("postTitle"),
      cell: ({ row }) => (
        <div
          title={row.original.title}
          className="truncate max-w-20 sm:max-w-30 md:max-w-40 lg:max-w-60 xl:max-w-60 2xl:max-w-80 block"
        >
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => (
        <div
          title={row.original.description}
          className="truncate max-w-32 sm:max-w-40 md:max-w-50 lg:max-w-60 xl:max-w-70 2xl:max-w-2xl block"
        >
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "admin_name",
      header: t("Admin_name"),
      cell: ({ row }) => tName("name", { ...row?.original?.admin }),
    },
    {
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
    },
    {
      accessorKey: "read_percent",
      header: t("Read_percent"),
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <Link href={`/messages/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
      ),
    },
  ];

  const parentSchedulesPostColumns: ColumnDef<ScheduledPost>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelectedScheduled()}
          onCheckedChange={(checked) =>
            handleSelectAllChangeScheduled(Boolean(checked))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedScheduledPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChangeScheduled(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
    },
    {
      accessorKey: "title",
      header: t("postTitle"),
      cell: ({ row }) => (
        <div
          title={row.original.title}
          className="truncate max-w-20 sm:max-w-30 md:max-w-40 lg:max-w-60 xl:max-w-60 2xl:max-w-80 block"
        >
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => (
        <div
          title={row.original.description}
          className="truncate max-w-32 sm:max-w-40 md:max-w-50 lg:max-w-60 xl:max-w-70 2xl:max-w-2xl block"
        >
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
    },
    {
      accessorKey: "scheduled_at",
      header: t("scheduledat"),
      cell: ({ row }) => {
        const value = row.getValue("scheduled_at");
        if (!value) return "-";
        return formatDateTime(value as string);
      },
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <Link href={`/messages/scheduled-message/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
      ),
    },
  ];

  const studentSchedulesPostColumns: ColumnDef<ScheduledPost>[] = [
    {
      accessorKey: "select",
      header: () => (
        <Checkbox
          checked={isAllSelectedScheduled()}
          onCheckedChange={(checked) =>
            handleSelectAllChangeScheduled(Boolean(checked))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedScheduledPosts.includes(row.original.id)}
          onCheckedChange={(checked) =>
            handleCheckboxChangeScheduled(row.original.id, Boolean(checked))
          }
        />
      ),
      meta: { notClickable: true },
    },
    {
      accessorKey: "title",
      header: t("postTitle"),
      cell: ({ row }) => (
        <div
          title={row.original.title}
          className="truncate max-w-20 sm:max-w-30 md:max-w-40 lg:max-w-60 xl:max-w-60 2xl:max-w-80 block"
        >
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => (
        <div
          title={row.original.description}
          className="truncate max-w-32 sm:max-w-40 md:max-w-50 lg:max-w-60 xl:max-w-70 2xl:max-w-2xl block"
        >
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: t("Priority"),
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        if (!priority) return "-";
        return tPriority(priority.toLowerCase());
      },
    },
    {
      accessorKey: "scheduled_at",
      header: t("scheduledat"),
      cell: ({ row }) => {
        const value = row.getValue("scheduled_at");
        if (!value) return "-";
        return formatDateTime(value as string);
      },
    },
    {
      header: t("action"),
      meta: { notClickable: true },
      cell: ({ row }) => (
        <Link href={`/messages/scheduled-message/edit/${row.original.id}`}>
          <Edit3 />
        </Link>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-4">
      {/* ── Header ── */}
      <PageHeader title={t("posts")} variant="list">
        <div className="flex gap-2">
          <Button
            icon={<Trash2 className="h-5 w-5" />}
            variant="destructive"
            disabled={activeSelectedCount === 0}
            onClick={() => setIsDialogOpen(true)}
          >
            {t("delete")} ({activeSelectedCount})
          </Button>

          {/* Delete confirmation dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
                <DialogDescription>{t("confirmDeleteDesc")}</DialogDescription>
              </DialogHeader>
              <div className="max-h-48 overflow-auto border rounded p-2 my-4">
                {(() => {
                  const list = showScheduled
                    ? (scheduledPosts?.scheduledPosts ?? [])
                    : (data?.posts ?? []);
                  const selectedIds = showScheduled
                    ? selectedScheduledPosts
                    : selectedPosts;
                  return list
                    .filter((post) => selectedIds.includes(post.id))
                    .map((post) => (
                      <div
                        key={post.id}
                        className="py-1 border-b last:border-b-0 flex justify-between"
                      >
                        <span>{post.title}</span>
                        <Trash2 className="inline-block mr-2 text-red-600" />
                      </div>
                    ));
                })()}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{t("cancel")}</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (showScheduled) {
                      deleteMultipleScheduled.mutate({
                        ids: selectedScheduledPosts,
                      });
                    } else {
                      deleteMultiple.mutate({ postIds: selectedPosts });
                    }
                  }}
                >
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            icon={<Plus className="h-5 w-5" />}
            onClick={() => setIsCreateDialogOpen(true)}
          >
            {t("createpost")}
          </Button>

          {/* Create post audience picker dialog */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogContent className="sm:max-w-lg pt-8 pb-8 px-10 rounded-2xl border border-transparent dark:border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-2xl font-bold text-center mb-6">
                    {t("createPostRecipientTitle")}
                  </DialogTitle>
                </DialogHeader>

                  <div className="mt-0 flex flex-col sm:flex-row gap-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    router.push(`/messages/create?audience=students`);
                  }}
                  aria-label={t("studentAudienceTitle")}
                  className={
                    "flex-1 flex items-center justify-center gap-4 px-2.5 py-2 rounded-xl border border-black/15 dark:border-transparent shadow-sm transition-transform duration-200 transform hover:scale-105 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[56px]"
                  }
                >
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <div className="text-base font-semibold text-foreground">
                    {t("studentAudienceTitle")}
                  </div>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    router.push(`/messages/create?audience=parents`);
                  }}
                  aria-label={t("parentAudienceTitle")}
                  className={
                    "flex-1 flex items-center justify-center gap-4 px-2.5 py-2 rounded-xl border border-black/15 dark:border-transparent shadow-sm transition-transform duration-200 transform hover:scale-105 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[56px]"
                  }
                >
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="text-base font-semibold text-foreground">
                    {t("parentAudienceTitle")}
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Audience buttons + content (Parents / Students + Scheduled) */}
      {(() => {
        const audienceControls = (
          <div className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setAudienceTab("parents");
                setSelectedPosts([]);
                setSelectedScheduledPosts([]);
                setPage(1);
              }}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                audienceTab === "parents"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              {t("parents")}
            </button>

            <span className="px-2 text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => {
                setAudienceTab("students");
                setSelectedPosts([]);
                setSelectedScheduledPosts([]);
                setPage(1);
              }}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm pr-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ml-2 ${
                audienceTab === "students"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              {t("students")}
            </button>

            <span className="px-2 text-muted-foreground">|</span>
            <label
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm pr-3 text-sm font-medium transition-all ml-4 ${
                showScheduled
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              htmlFor="show-scheduled"
            >
              <Checkbox
                id="show-scheduled"
                checked={showScheduled}
                onCheckedChange={(checked) => {
                  setShowScheduled(Boolean(checked));
                  setSelectedPosts([]);
                  setSelectedScheduledPosts([]);
                  setPage(1);
                }}
              />
              <CalendarClock className="h-4 w-4 ml-2 mr-2" />
              <span className="cursor-pointer font-normal">
                {t("scheduledMessages")}
              </span>
            </label>
          </div>
        );

        return audienceTab === "parents" ? (
          <MessagesContent
            t={t}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            commitSearch={commitSearch}
            data={showScheduled ? null : data}
            scheduledPosts={showScheduled ? scheduledPosts : null}
            showScheduled={showScheduled}
            postColumns={parentPostColumns}
            schedulesPostColumns={parentSchedulesPostColumns}
            page={page}
            setPage={setPage}
            perPage={perPage}
            handlePerPageChange={handlePerPageChange}
            linkPrefix="/messages"
            scheduledLinkPrefix="/messages/scheduled-message/"
            controls={audienceControls}
          />
        ) : (
          <MessagesContent
            t={t}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            commitSearch={commitSearch}
            data={showScheduled ? null : data}
            scheduledPosts={showScheduled ? scheduledPosts : null}
            showScheduled={showScheduled}
            postColumns={studentPostColumns}
            schedulesPostColumns={studentSchedulesPostColumns}
            page={page}
            setPage={setPage}
            perPage={perPage}
            handlePerPageChange={handlePerPageChange}
            linkPrefix="/messages"
            scheduledLinkPrefix="/messages/scheduled-message/"
            controls={audienceControls}
          />
        );
      })()}
    </div>
  );
}

// ── Shared table + pagination layout ─────────────────────────────────────────

interface MessagesContentProps {
  t: ReturnType<typeof useTranslations>;
  searchInput: string;
  setSearchInput: (v: string) => void;
  commitSearch: (v: string) => void;
  data: PostApi | null | undefined;
  scheduledPosts:
    | { scheduledPosts: ScheduledPost[]; pagination: any }
    | null
    | undefined;
  showScheduled: boolean;
  postColumns: ColumnDef<Post>[];
  schedulesPostColumns: ColumnDef<ScheduledPost>[];
  page: number;
  setPage: (p: number) => void;
  perPage: number;
  handlePerPageChange: (n: number) => void;
  linkPrefix: string;
  scheduledLinkPrefix: string;
  controls?: React.ReactNode;
}

function MessagesContent({
  t,
  searchInput,
  setSearchInput,
  commitSearch,
  data,
  scheduledPosts,
  showScheduled,
  postColumns,
  schedulesPostColumns,
  page,
  setPage,
  perPage,
  handlePerPageChange,
  linkPrefix,
  scheduledLinkPrefix,
  controls,
}: MessagesContentProps) {
  const paginationData = showScheduled
    ? (scheduledPosts?.pagination ?? null)
    : (data?.pagination ?? null);

  return (
    <>
      <div className="flex items-center justify-between w-full gap-2 mb-2">
        <div className="flex-1 px-3">
          <Input
            placeholder={t("filter")}
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const next = e.target.value;
              setSearchInput(next);
              commitSearch(next);
            }}
            className="w-full"
          />
        </div>

        <div className="flex-shrink-0">
          <PaginationApi data={paginationData} setPage={setPage} />
        </div>
      </div>

      {/* Audience controls below search/pagination as requested */}
      {controls && (
        <div className="flex items-center gap-3 mb-3">{controls}</div>
      )}

      <Card x-chunk="dashboard-05-chunk-3">
        {showScheduled ? (
          <TableApi
            linkPrefix={scheduledLinkPrefix}
            data={scheduledPosts?.scheduledPosts ?? null}
            columns={schedulesPostColumns}
          />
        ) : (
          <TableApi
            linkPrefix={linkPrefix}
            data={data?.posts ?? null}
            columns={postColumns}
          />
        )}
      </Card>

      {/* Per-page selector — only show for regular messages */}
      {!showScheduled && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">
            {t("postsPerPage") || "Posts per page:"}
          </span>
          <Select
            onValueChange={(value) => handlePerPageChange(Number(value))}
            value={perPage.toString()}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder={t("choosePostsPerPage") || "Choose"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {[10, 30, 50, 100].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
