import { tox } from "../../../lib/toxApi";

export const listFamilies = (params = {}) =>
  tox.get("/compound-families/", { page: 1, page_size: 200, ...params });

export const getFamily = (id) => tox.get(`/compound-families/${id}`);

export const detectFamily = (query) =>
  tox.get("/compound-families/detect", { query });

export const detectFamilyPost = (body) => tox.post("/compound-families/detect", body);

// Governance — these are scaffolded server-side; the UI still wires
// them so the contract is in place once full implementation lands.
export const listGovernanceRules = () =>
  tox.get("/compound-families/governance/rules");

export const listGovernanceFeedback = () =>
  tox.get("/compound-families/governance/feedback");

export const createGovernanceRule = (body) =>
  tox.post("/compound-families/governance/rules", body);

export const submitGovernanceFeedback = (body) =>
  tox.post("/compound-families/governance/feedback", body);

export const simulateGovernance = (body) =>
  tox.post("/compound-families/governance/simulate", body);
