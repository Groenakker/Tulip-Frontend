/**
 * TRA project API helpers.
 *
 * Wraps the /api/tox/v1/tra-projects/* endpoints exposed by the ported
 * v1.routes.js. See `Tulip-Backend/src/tox/routes/v1/v1.routes.js`
 * lines ~353-707 for the full surface.
 */

import { tox } from "../../../lib/toxApi";

export const listTRAProjects = (params = {}) =>
  tox.get("/tra-projects", { page: 1, page_size: 50, ...params });

export const createTRAProject = (body) => tox.post("/tra-projects", body);

export const getTRAProject = (id) => tox.get(`/tra-projects/${id}`);
export const updateTRAProject = (id, body) => tox.patch(`/tra-projects/${id}`, body);
export const deleteTRAProject = (id) => tox.del(`/tra-projects/${id}`);

export const listTRACompounds = (id) => tox.get(`/tra-projects/${id}/compounds`);
export const addTRACompound = (id, body) => tox.post(`/tra-projects/${id}/compounds`, body);
export const updateTRACompound = (projectId, assignmentId, body) =>
  tox.patch(`/tra-projects/${projectId}/compounds/${assignmentId}`, body);
export const removeTRACompound = (projectId, assignmentId) =>
  tox.del(`/tra-projects/${projectId}/compounds/${assignmentId}`);

export const getAvailablePods = (projectId, assignmentId) =>
  tox.get(`/tra-projects/${projectId}/compounds/${assignmentId}/available-pods`);

export const getAssignmentPodAssessment = (projectId, assignmentId) =>
  tox.get(`/tra-projects/${projectId}/compounds/${assignmentId}/pod-assessment`);

export const updateAssignmentPodAssessment = (projectId, assignmentId, body) =>
  tox.patch(`/tra-projects/${projectId}/compounds/${assignmentId}/pod-assessment`, body);

export const confirmReview = (projectId, assignmentId, body = {}) =>
  tox.post(`/tra-projects/${projectId}/compounds/${assignmentId}/confirm-review`, body);

export const reopenReview = (projectId, assignmentId, body = {}) =>
  tox.post(`/tra-projects/${projectId}/compounds/${assignmentId}/reopen-review`, body);

export const getEvidenceSupport = (projectId, assignmentId) =>
  tox.get(`/tra-projects/${projectId}/compounds/${assignmentId}/evidence-support`);

export const runResearch = (projectId, body) =>
  tox.post(`/tra-projects/${projectId}/research`, body);
