import { toast } from "../Toaster";

/**
 * POSTs { ids } to the given bulk-delete endpoint and surfaces a friendly
 * toast for the result. Returns the parsed response payload on success,
 * or `null` if the request failed (the toast has already been shown).
 *
 * Usage:
 *   const result = await runBulkDelete({
 *     url: `${VITE_BACKEND_URL}/api/projects/bulk-delete`,
 *     ids,
 *     entityLabel: "project",
 *   });
 *   if (result) refetch();
 */
export async function runBulkDelete({ url, ids, entityLabel = "record" }) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        data?.message ||
        (response.status === 403
          ? `You don't have permission to delete ${entityLabel}s.`
          : `Failed to delete ${entityLabel}s (HTTP ${response.status}).`);
      toast.error(msg);
      return null;
    }

    const deleted = data.deleted ?? 0;
    const notFound = data.notFound ?? 0;
    if (deleted > 0) {
      toast.success(
        `${deleted} ${entityLabel}${deleted === 1 ? "" : "s"} deleted${
          notFound > 0 ? ` (${notFound} skipped / not found)` : ""
        }.`
      );
    } else {
      toast.warning(data.message || `No ${entityLabel}s were deleted.`);
    }
    return data;
  } catch (err) {
    console.error(`Bulk delete (${entityLabel}) failed:`, err);
    toast.error(
      err?.message ||
        `Bulk delete failed. Check your connection and try again.`
    );
    return null;
  }
}

export default runBulkDelete;
