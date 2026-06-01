/**
 * Library API helpers.
 *
 * Wraps the /api/tox/v1/library/* endpoints. Each function is a thin
 * passthrough so pages stay declarative.
 */

import { tox } from "../../../lib/toxApi";

export function listLibrary({ page = 1, page_size = 20, query } = {}) {
  return tox.get("/library/", { page, page_size, query });
}

export function getLibraryItem(id) {
  return tox.get(`/library/${id}`);
}

export function getLibraryFullReport(id) {
  return tox.get(`/library/${id}/full-report`);
}

export function updateLibraryItem(id, patch) {
  return tox.patch(`/library/${id}`, patch);
}

export function deleteLibraryItem(id) {
  return tox.del(`/library/${id}`);
}

export function refreshLibraryResearch(id) {
  return tox.post(`/library/${id}/refresh-research`);
}

export function saveFromResearch(payload) {
  return tox.post("/library/save-from-research", payload);
}

export function getPodAssessment(id) {
  return tox.get(`/library/${id}/pod-assessment`);
}

export function updatePodAssessment(id, overrides) {
  return tox.patch(`/library/${id}/pod-assessment`, overrides);
}
