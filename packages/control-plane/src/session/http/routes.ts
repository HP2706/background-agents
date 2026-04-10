import { SessionInternalPaths, type SessionInternalPath } from "../contracts";

export type SessionInternalRouteHandler = (
  request: Request,
  url: URL
) => Promise<Response> | Response;

export interface SessionInternalRoute {
  method: "GET" | "POST";
  path: SessionInternalPath;
  handler: SessionInternalRouteHandler;
}

export interface SessionInternalRouteHandlers {
  init: SessionInternalRouteHandler;
  state: SessionInternalRouteHandler;
  prompt: SessionInternalRouteHandler;
  stop: SessionInternalRouteHandler;
  sandboxEvent: SessionInternalRouteHandler;
  listParticipants: SessionInternalRouteHandler;
  addParticipant: SessionInternalRouteHandler;
  listEvents: SessionInternalRouteHandler;
  listArtifacts: SessionInternalRouteHandler;
  listMessages: SessionInternalRouteHandler;
  createPr: SessionInternalRouteHandler;
  wsToken: SessionInternalRouteHandler;
  updateTitle: SessionInternalRouteHandler;
  archive: SessionInternalRouteHandler;
  unarchive: SessionInternalRouteHandler;
  verifySandboxToken: SessionInternalRouteHandler;
  openaiTokenRefresh: SessionInternalRouteHandler;
  spawnContext: SessionInternalRouteHandler;
  childSummary: SessionInternalRouteHandler;
  cancel: SessionInternalRouteHandler;
  childSessionUpdate: SessionInternalRouteHandler;
  // Supervisor
  supervisorForwardEvent: SessionInternalRouteHandler;
  supervisorListWatched: SessionInternalRouteHandler;
  supervisorAddWatched: SessionInternalRouteHandler;
  supervisorRemoveWatched: SessionInternalRouteHandler;
  supervisorGuidance: SessionInternalRouteHandler;
  registerSupervisor: SessionInternalRouteHandler;
}

/**
 * Build internal SessionDO HTTP routes from injected handlers.
 * Keeps route-to-path wiring separate from SessionDO business handlers.
 */
export function createSessionInternalRoutes(
  handlers: SessionInternalRouteHandlers
): SessionInternalRoute[] {
  return [
    { method: "POST", path: SessionInternalPaths.init, handler: handlers.init },
    { method: "GET", path: SessionInternalPaths.state, handler: handlers.state },
    { method: "POST", path: SessionInternalPaths.prompt, handler: handlers.prompt },
    { method: "POST", path: SessionInternalPaths.stop, handler: handlers.stop },
    { method: "POST", path: SessionInternalPaths.sandboxEvent, handler: handlers.sandboxEvent },
    {
      method: "GET",
      path: SessionInternalPaths.participants,
      handler: handlers.listParticipants,
    },
    {
      method: "POST",
      path: SessionInternalPaths.participants,
      handler: handlers.addParticipant,
    },
    { method: "GET", path: SessionInternalPaths.events, handler: handlers.listEvents },
    { method: "GET", path: SessionInternalPaths.artifacts, handler: handlers.listArtifacts },
    { method: "GET", path: SessionInternalPaths.messages, handler: handlers.listMessages },
    { method: "POST", path: SessionInternalPaths.createPr, handler: handlers.createPr },
    { method: "POST", path: SessionInternalPaths.wsToken, handler: handlers.wsToken },
    { method: "POST", path: SessionInternalPaths.updateTitle, handler: handlers.updateTitle },
    { method: "POST", path: SessionInternalPaths.archive, handler: handlers.archive },
    { method: "POST", path: SessionInternalPaths.unarchive, handler: handlers.unarchive },
    {
      method: "POST",
      path: SessionInternalPaths.verifySandboxToken,
      handler: handlers.verifySandboxToken,
    },
    {
      method: "POST",
      path: SessionInternalPaths.openaiTokenRefresh,
      handler: handlers.openaiTokenRefresh,
    },
    { method: "GET", path: SessionInternalPaths.spawnContext, handler: handlers.spawnContext },
    { method: "GET", path: SessionInternalPaths.childSummary, handler: handlers.childSummary },
    { method: "POST", path: SessionInternalPaths.cancel, handler: handlers.cancel },
    {
      method: "POST",
      path: SessionInternalPaths.childSessionUpdate,
      handler: handlers.childSessionUpdate,
    },
    // Supervisor routes
    {
      method: "POST",
      path: SessionInternalPaths.supervisorForwardEvent,
      handler: handlers.supervisorForwardEvent,
    },
    {
      method: "GET",
      path: SessionInternalPaths.supervisorWatchedSessions,
      handler: handlers.supervisorListWatched,
    },
    {
      method: "POST",
      path: SessionInternalPaths.supervisorAddWatched,
      handler: handlers.supervisorAddWatched,
    },
    {
      method: "POST",
      path: SessionInternalPaths.supervisorRemoveWatched,
      handler: handlers.supervisorRemoveWatched,
    },
    {
      method: "POST",
      path: SessionInternalPaths.supervisorGuidance,
      handler: handlers.supervisorGuidance,
    },
    {
      method: "POST",
      path: SessionInternalPaths.registerSupervisor,
      handler: handlers.registerSupervisor,
    },
  ];
}
