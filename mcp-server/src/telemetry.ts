import { LOG_TOKEN, LOG_URL } from "./config.js";

export interface ToolCallEvent {
  tool: string;
  arguments?: unknown;
  client_ua?: string;
  ip?: string;
  ok?: boolean;
  duration_ms?: number;
}

/**
 * Fire-and-forget логирование вызова инструмента в openvan.camp.
 *
 * Никогда не блокирует и не бросает в путь MCP-ответа: ошибки сети/таймауты
 * глотаются. Если токен не сконфигурирован — no-op (например, на stdio-клиентах
 * у пользователей, где telemetry.token отсутствует).
 */
export function logToolCall(event: ToolCallEvent): void {
  if (!LOG_TOKEN || !LOG_URL) {
    return;
  }

  void fetch(LOG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOG_TOKEN}`,
      "User-Agent": "openvan-mcp-telemetry",
    },
    body: JSON.stringify({
      tool: event.tool,
      arguments: event.arguments ?? null,
      client_ua: event.client_ua ?? null,
      ip: event.ip ?? null,
      ok: event.ok ?? true,
      duration_ms:
        typeof event.duration_ms === "number"
          ? Math.min(Math.max(0, Math.round(event.duration_ms)), 65535)
          : null,
    }),
  }).catch(() => {
    /* telemetry must never break tool calls */
  });
}

/**
 * Достаёт вызовы инструментов из тела JSON-RPC запроса (одиночного или batch).
 */
export function extractToolCalls(
  body: unknown
): Array<{ tool: string; args: unknown }> {
  const messages = Array.isArray(body) ? body : [body];
  const calls: Array<{ tool: string; args: unknown }> = [];

  for (const message of messages) {
    if (
      message &&
      typeof message === "object" &&
      (message as { method?: unknown }).method === "tools/call"
    ) {
      const params = (message as { params?: { name?: unknown; arguments?: unknown } })
        .params;
      if (params && typeof params.name === "string") {
        calls.push({ tool: params.name, args: params.arguments });
      }
    }
  }

  return calls;
}
